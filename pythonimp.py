from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import os
import traceback

app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or ["*"] for all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#  Input Models 

class VMRequest(BaseModel):
    box_name: str
    vm_name: str
    cpus: int
    memory: int

class SSHRequest(BaseModel):
    vm_ip: str = "192.168.56.10"  # Default for Vagrant private_network

#  Utility Functions 

def write_vagrantfile(box_name, vm_name, memory, cpus, vagrant_dir):
    print(f" DEBUG: write_vagrantfile() called with -> box_name: '{box_name}', vm_name: '{vm_name}', memory: {memory}, cpus: {cpus}")
    
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

    print(" DEBUG: Vagrantfile content written:\n", vagrantfile_content.strip())
    print(f" Vagrantfile written to {vagrantfile_path}")


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
'''
    os.makedirs(terraform_dir, exist_ok=True)
    tf_path = os.path.join(terraform_dir, "main.tf")
    
    with open(tf_path, "w") as f:
        f.write(terraform_code.strip())
    
    print(f" Terraform config written to {tf_path}")


def run_command(command, cwd=None):
    try:
        print(f" Running command: {command} (in {cwd})")
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
        error_msg = f" Command failed:\n{command}\nSTDOUT:\n{e.stdout}\nSTDERR:\n{e.stderr}"
        print(error_msg)
        raise RuntimeError(error_msg)

#SSH Helper 

def ssh_into_vagrant_vm(vm_ip, vagrant_dir):
    private_key_path = os.path.join(vagrant_dir, ".vagrant", "machines", "default", "virtualbox", "private_key")
    
    if not os.path.exists(private_key_path):
        raise FileNotFoundError(f"SSH private key not found at: {private_key_path}")
    
    ssh_command = [
        "ssh",
        "-i", private_key_path,
        f"vagrant@{vm_ip}",
        "-o", "StrictHostKeyChecking=no",
        "echo ' SSH connection successful!'"
    ]
    
    print(f" Running SSH command: {' '.join(ssh_command)}")
    result = subprocess.run(ssh_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    
    if result.returncode != 0:
        raise RuntimeError(f"SSH failed:\n{result.stderr}")
    
    return result.stdout.strip()

# ========== API Endpoints ==========

@app.post("/create-vm")
def create_vm(req: VMRequest):
    print(" Received VM creation request:", req)
    print(" Request body as dict:", req.dict())

    terraform_dir = r"C:\Users\Arin Raut\v-t-vm"
    vagrant_dir = os.path.join(terraform_dir, "vagrant")

    try:
        #  Step 1: Write Vagrantfile and Terraform configs
        write_vagrantfile(req.box_name, req.vm_name, req.memory, req.cpus, vagrant_dir)
        write_terraform_config(terraform_dir)

        #  Step 2: Terraform Init
        print(" Running terraform init...")
        init_output = run_command("terraform init", cwd=terraform_dir)
        print(" Terraform init complete.\n", init_output)

        #  Step 3: Terraform Apply
        print(" Running terraform apply...")
        apply_output = run_command("terraform apply -auto-approve", cwd=terraform_dir)
        print(" Terraform apply complete.\n", apply_output)

        return {
            "message": "🎉 VM created and provisioned successfully.",
            "terraform_init": init_output,
            "terraform_apply": apply_output
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ssh-into-vm")
def ssh_vm(request: SSHRequest):
    terraform_dir = r"C:\Users\Arin Raut\v-t-vm"
    vagrant_dir = os.path.join(terraform_dir, "vagrant")
    
    try:
        output = ssh_into_vagrant_vm(request.vm_ip, vagrant_dir)
        return {
            "message": " SSH successful!",
            "output": output
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
