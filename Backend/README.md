# VM Creation Backend

This is the Python FastAPI backend for the VM Creation Debugger Interface.

## Setup

1. Install Python 3.8 or higher
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the server:
   ```bash
   python main.py
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## API Endpoints

- `POST /create-vm` - Create a new VM using Vagrant + Terraform
- `POST /destroy-vm` - Destroy an existing VM
- `POST /ssh-into-vm` - SSH into a running VM

## Requirements

- VirtualBox installed
- Vagrant installed
- Terraform installed
- Windows environment (currently configured for Windows paths)

## Configuration

The backend is configured to work with:
- Terraform directory: `C:\Users\Arin Raut\v-t-vm`
- CORS enabled for `http://localhost:3000` and `http://localhost:5173`
- Default VM IP: `192.168.56.10`