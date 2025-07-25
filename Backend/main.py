from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from fastapi import FastAPI, HTTPException
from fastapi import Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
import os
import subprocess
import traceback
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from supaabaseee.functions.sendmail.send_email import send_email
import uuid
from typing import Optional, List


app = FastAPI()
router = APIRouter()

class EmailRequest(BaseModel):
    to: str
    subject: str
    body: str

@router.post("/send-email")
async def handle_send_email(req: EmailRequest):
    try:
        send_email(req.to, req.subject, req.body)
        return {"message": "Email sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
                   "http://localhost:5173"],  # added vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# ---JWT Configuration----
JWT_SECRET = os.getenv(
    "JWT_SECRET", "your-super-secure-jwt-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_HOURS = 24*7  # 7 days

# ---Security---
security = HTTPBearer()

#  Input Models

class UserRegister(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class VerificationRequest(BaseModel):
    email: str
    code: str

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    email: str
    token: str
    new_password: str
class VMLogCreate(BaseModel):
    box_name:str
    vm_name:str
    cpus:int
    memory:int
class VMLogUpdate(BaseModel):
    status: Optional[str] = None
    logs: Optional[List[dict]] = None
    terraform_output: Optional[str] =None
class VMLogResponse(BaseModel):
    id: str
    user_email: str
    box_name: str
    vm_name: str
    cpus: int
    memory: int
    status: str
    terraform_output: Optional[str]
    created_at: str
class VMRequest(BaseModel):
    box_name: str
    vm_name: str
    cpus: int
    memory: int
class VMDestroyRequest(BaseModel):
    vm_name: str

class SSHRequest(BaseModel):
    vm_ip: str = "192.168.56.10"  # Default for Vagrant private_network

# JWT utility functions

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRES_HOURS)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials,
                             JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("user_id")
        email: str = payload.get("email")
        if user_id is None or email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"user_id": user_id, "email": email}
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def get_or_create_user(email: str, password_hash: str = None) -> dict:
    """Get existing user or create new one, ensuring we have a user_id"""
    try:
        # Try to get existing user
        res = supabase.table("users").select("*").eq("email", email).execute()
        
        if res.data and len(res.data) > 0:
            user = res.data[0]
            # Ensure user has an ID
            if not user.get('id'):
                # Update user with UUID if missing
                user_id = str(uuid.uuid4())
                supabase.table("users").update({"id": user_id}).eq("email", email).execute()
                user['id'] = user_id
            return user
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            new_user = {
                "id": user_id,
                "email": email,
                "email_verified": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            if password_hash:
                new_user["password_hash"] = password_hash
            
            result = supabase.table("users").insert(new_user).execute()
            return result.data[0] if result.data else new_user
    except Exception as e:
        print(f"Error in get_or_create_user: {e}")
        raise

@app.post("/auth/register")
def register_user(user_data: UserRegister):
    try:
        # Check if user already exists
        res = supabase.table("users").select("*").eq("email", user_data.email).execute()
        if res.data and len(res.data) > 0:
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Hash password and create user
        hashed_password = hash_password(user_data.password)
        user = get_or_create_user(user_data.email, hashed_password)

        # Generate verification code
        import random
        verification_code = str(random.randint(100000, 999999))
        supabase.table("verification_codes").insert({
            "email": user_data.email,
            "code": verification_code,
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()

        print(f"Verification code for {user_data.email}: {verification_code}")

        return {
            "message": "User registered, check console for verification code.", 
            "demo_code": verification_code
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/login")
def login_user(user_data: UserLogin):
    try:
        res = supabase.table("users").select("*").eq("email", user_data.email).execute()
        user = res.data[0] if res.data else None
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        if not user.get("email_verified", False):
            raise HTTPException(status_code=401, detail="Email is not verified")
        
        if not verify_password(user_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Ensure user has an ID
        if not user.get('id'):
            user_id = str(uuid.uuid4())
            supabase.table("users").update({"id": user_id}).eq("email", user_data.email).execute()
            user['id'] = user_id

        # Create JWT with both user_id and email
        access_token = create_access_token({
            "user_id": user["id"],
            "email": user_data.email,
            "email_verified": True
        })
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": user_data.email,
                "email_verified": True,
                "created_at": user.get("created_at")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/send-verification")
def send_verification_code(request: dict):
    try:
        email = request.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")

        import random
        verification_code = str(random.randint(100000, 999999))
        supabase.table("verification_codes").insert({
            "email": email,
            "code": verification_code,
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()

        print(f"Verification code for {email}: {verification_code}")

        return {
            "message": "Verification code is sent. Check console.",
            "demo_code": verification_code
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/verify-code")
def verify_code_and_login(request: VerificationRequest):
    try:
        # Get verification code
        res = supabase.table("verification_codes").select("*").eq("email", request.email).order("created_at", desc=True).limit(1).execute()
        code_record = res.data[0] if res.data else None
        
        if not code_record:
            raise HTTPException(status_code=400, detail="No verification code found")

        if code_record["used"]:
            raise HTTPException(status_code=400, detail="Verification code already used")
            
        expires_at = datetime.fromisoformat(code_record["expires_at"])
        now_utc = datetime.now(timezone.utc)
        
        if now_utc > expires_at:
            raise HTTPException(status_code=400, detail="Verification code expired")

        if code_record["code"] != request.code:
            raise HTTPException(status_code=400, detail="Invalid verification code")

        # Mark code as used
        supabase.table("verification_codes").update({"used": True}).eq("id", code_record["id"]).execute()

        # Get or create user and ensure they have an ID
        user = get_or_create_user(request.email)
        
        # Update user as verified
        supabase.table("users").update({"email_verified": True}).eq("email", request.email).execute()
        user["email_verified"] = True

        # Create JWT with both user_id and email
        access_token = create_access_token({
            "user_id": user["id"],
            "email": request.email,
            "email_verified": True
        })

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "email": request.email,
                "email_verified": True,
                "created_at": user.get("created_at")
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/forgot-password")
def forgot_password(request: PasswordResetRequest):
    try:
        res = supabase.table("users").select("*").eq("email", request.email).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="User not found")

        import random
        reset_token = str(random.randint(100000, 999999))
        supabase.table("password_resets").insert({
            "email": request.email,
            "token": reset_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()

        print(f"Password reset code for {request.email}: {reset_token}")

        return {
            "message": "Password reset code sent. Check console.",
            "demo_code": reset_token
        }

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/reset-password")
def reset_password(request: PasswordResetConfirm):
    try:
        res = supabase.table("password_resets").select("*").eq("email", request.email).order("created_at", desc=True).limit(1).execute()
        reset_record = res.data[0] if res.data else None
        
        if not reset_record:
            raise HTTPException(status_code=400, detail="No reset request found")

        if reset_record["used"]:
            raise HTTPException(status_code=400, detail="Reset token already used")

        expires_at = datetime.fromisoformat(reset_record["expires_at"])
        now_utc = datetime.now(timezone.utc)
        
        if now_utc > expires_at:
            raise HTTPException(status_code=400, detail="Reset token expired")

        if reset_record["token"] != request.token:
            raise HTTPException(status_code=400, detail="Invalid reset token")

        res_user = supabase.table("users").select("*").eq("email", request.email).execute()
        if not res_user.data:
            raise HTTPException(status_code=404, detail="User not found")

        hashed_new_password = hash_password(request.new_password)
        supabase.table("users").update({"password_hash": hashed_new_password}).eq("email", request.email).execute()
        supabase.table("password_resets").update({"used": True}).eq("id", reset_record["id"]).execute()

        return {"message": "Password reset successfully"}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/auth/me")
def get_current_user(current_user: dict = Depends(verify_token)):
    try:
        res = supabase.table("users").select("*").eq("email", current_user["email"]).execute()
        user = res.data[0] if res.data else None
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Ensure user has an ID
        if not user.get('id'):
            user_id = str(uuid.uuid4())
            supabase.table("users").update({"id": user_id}).eq("email", current_user["email"]).execute()
            user['id'] = user_id
        
        return {
            "user_id": user["id"],
            "email": user["email"],
            "email_verified": user.get("email_verified", False),
            "created_at": user.get("created_at")
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/vm-logs", response_model=VMLogResponse)
def create_vm_log(log_data: VMLogCreate, current_user: dict = Depends(verify_token)):
    '''This Creates a New VM creation logs entry'''
    try:
        vm_log ={
            "user_email": current_user["email"],
            "box_name": log_data.box_name,
            "vm_name": log_data.vm_name,
            "cpus": log_data.cpus,
            "memory": log_data.memory,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        } 
        
        result = supabase.table("vm_creation_logs").insert(vm_log).execute()
        
        if result.data:
            return result.data[0]
        else:
            raise HTTPException(status_code=500, detail="Failed to create VM log")
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail= str(e))
    
@app.get("/vm-logs")
def get_vm_logs(current_user: dict = Depends(verify_token)):
    """Get all VM logs for the current user"""
    try:
        result= supabase.table("vm_creation_logs").select("*").eq("user_email", current_user["email"]).order("created_at", desc=True).execute()
        # only return in the format the frontend wants ig
        return{
            "logs": result.data if result.data else []
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.put("/vm-logs/{log_id}")
def update_vm_log(log_id: str, log_update: VMLogUpdate, current_user: dict = Depends(verify_token)):
    """Update a VM log entry"""
    try:
        existing_log = supabase.table("vm_creation_logs").select("*").eq("id", log_id).eq("user_email", current_user["email"]).execute()
        
        if not existing_log.data:
            raise HTTPException(status_code=404, detail= "VM log not found")
        
        update_data={}
        if log_update.status is not None:
            update_data["status"] = log_update.status
        if log_update.terraform_output is not None:
            update_data["terraform_output"] = log_update.terraform_output
        if log_update.logs is not None:
            update_data["terraform_output"] = str (log_update.logs)
            
        #Update the log
        result = supabase.table("vm_creation_logs").update(update_data).eq("id", log_id).execute()
        
        return {"message": "VM log updated successfully"}
    
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.delete("/vm-logs/{log_id}")
def delete_vm_log(log_id: str, current_user: dict = Depends(verify_token)):
    """Delete a VM log entry"""
    try:
        existing_log = supabase.table("vm_creation_logs").select("*").eq("id", log_id).eq("user_email", current_user["email"]).execute()
        
        if not existing_log.data:
            raise HTTPException(status_code=404, detail="VM log not found")
        
        #Delete the log
        supabase.table("vm_creation_logs").delete().eq("id", log_id).execute()
        
        return {"message": "VM log deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail= str(e))

# Utility Functions

def write_vagrantfile(box_name, vm_name, memory, cpus, vagrant_dir):
    print(f"DEBUG: write_vagrantfile() called with -> box_name: '{box_name}', vm_name: '{vm_name}', memory: {memory}, cpus: {cpus}")

    vagrantfile_content = f'''Vagrant.configure("2") do |config|
  config.vm.box = "{box_name}"
  config.vm.hostname = "{vm_name}"
  config.vm.network "private_network", ip: "192.168.56.10"

  config.vm.provider "virtualbox" do |vb|
    vb.name = "{vm_name}"
    vb.memory = "{memory}"
    vb.cpus = {cpus}
  end
  config.vm.provision "shell", inline: <<-SHELL
    sudo apt-get update
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
  SHELL
end'''

    os.makedirs(vagrant_dir, exist_ok=True)
    vagrantfile_path = os.path.join(vagrant_dir, "Vagrantfile")

    with open(vagrantfile_path, "w") as vf:
        vf.write(vagrantfile_content.strip())

    print("DEBUG: Vagrantfile content written:\n", vagrantfile_content.strip())
    print(f"Vagrantfile written to {vagrantfile_path}")

def write_terraform_config(terraform_dir):
    terraform_code = '''
terraform {
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

provider "null" {}

resource "null_resource" "vagrant_up" {
  provisioner "local-exec" {
    command     = "vagrant up"
    working_dir = "${path.module}/vagrant"
  }

  triggers = {
    always_run = timestamp()
  }
}

resource "null_resource" "vagrant_destroy"{
    provisioner "local-exec"{
        command = "vagrant destroy -f"
        working_dir = "${path.module}/vagrant"
        when = destroy  
    }
}
'''
    os.makedirs(terraform_dir, exist_ok=True)
    tf_path = os.path.join(terraform_dir, "main.tf")

    with open(tf_path, "w") as f:
        f.write(terraform_code.strip())

    print(f"Terraform config written to {tf_path}")

def run_command(command, cwd=None):
    try:
        print(f"Running command: {command} (in {cwd})")
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        error_msg = f"Command failed:\n{command}\nSTDOUT:\n{e.stdout}\nSTDERR:\n{e.stderr}"
        print(error_msg)
        raise RuntimeError(error_msg)

# SSH Helper

def ssh_into_vagrant_vm(vm_ip, vagrant_dir):
    private_key_path = os.path.join(vagrant_dir, ".vagrant", "machines", "default", "virtualbox", "private_key")

    if not os.path.exists(private_key_path):
        raise FileNotFoundError(f"SSH private key not found at: {private_key_path}")

    ssh_command = [
        "ssh",
        "-i", private_key_path,
        f"vagrant@{vm_ip}",
        "-o", "StrictHostKeyChecking=no",
        "echo 'SSH connection successful!'"
    ]

    print(f"Running SSH command: {' '.join(ssh_command)}")
    result = subprocess.run(ssh_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"SSH failed:\n{result.stderr}")

    return result.stdout.strip()

# ========== API Endpoints ==========

@app.post("/create-vm")
def create_vm(req: VMRequest, current_user: dict = Depends(verify_token)):
    print("Received VM creation request:", req)
    print("Request body as dict:", req.dict())
    print("Authenticated user:", current_user)

    terraform_dir = r"C:\Users\Arin Raut\v-t-vm"
    vagrant_dir = os.path.join(terraform_dir, "vagrant")
    
    #Create VM log log entry at start
    vm_log_data ={
        "user_email": current_user["email"],
        "box_name": req.box_name,
        "vm_name": req.vm_name,
        "cpus": req.cpus,
        "memory": req.memory,
        "status":"pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    vm_log_result = supabase.table("vm_creation_logs").insert(vm_log_data).execute()
    vm_log_id= vm_log_result.data[0]["id"] if vm_log_result.data else None

    try:
        # Step 1: Write Vagrantfile and Terraform configs
        write_vagrantfile(req.box_name, req.vm_name, req.memory, req.cpus, vagrant_dir)
        write_terraform_config(terraform_dir)

        # Step 2: Terraform Init
        print("Running terraform init...")
        init_output = run_command("terraform init", cwd=terraform_dir)
        print("Terraform init complete.\n", init_output)

        # Step 3: Terraform Apply
        print("Running terraform apply...")
        apply_output = run_command("terraform apply -auto-approve", cwd=terraform_dir)
        print("Terraform apply complete.\n", apply_output)
        
        #Update VM log with success
        if vm_log_id:
            supabase.table("vm_creation_logs").update({
                "status": "success",
                "terraform_output": apply_output
            }).eq("id", vm_log_id).execute()

        return {
            "message": "🎉 VM created and provisioned successfully.",
            "terraform_init": init_output,
            "terraform_apply": apply_output,
            "vm_log_id":vm_log_id
        }

    except Exception as e:
        
        if vm_log_id:
            supabase.table("vm_creation_logs").update({
                "status": "error",
                "terraform_output": str(e)
            }).eq("id", vm_log_id).execute()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/destroy-vm")
def destroy_vm(req: VMDestroyRequest, current_user: dict = Depends(verify_token)):
    print("Received VM destruction request:", req)
    print("Authenticated user:", current_user)

    terraform_dir = r"C:\Users\Arin Raut\v-t-vm"
    vagrant_dir = os.path.join(terraform_dir, "vagrant")

    try:
        # Step 1: Terraform Destroy
        print("Running terraform destroy...")
        destroy_output = run_command("terraform destroy -auto-approve", cwd=terraform_dir)
        print("Terraform destroy complete.\n", destroy_output)

        return {
            "message": "🗑️ VM destroyed successfully.",
            "terraform_destroy": destroy_output
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ssh-into-vm")
def ssh_vm(request: SSHRequest, current_user: dict = Depends(verify_token)):
    print("SSH request from user:", current_user)
    terraform_dir = r"C:\Users\Arin Raut\v-t-vm"
    vagrant_dir = os.path.join(terraform_dir, "vagrant")

    try:
        output = ssh_into_vagrant_vm(request.vm_ip, vagrant_dir)
        return {
            "message": "SSH successful!",
            "output": output
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn 
    uvicorn.run(app, host="0.0.0.0", port=8000)