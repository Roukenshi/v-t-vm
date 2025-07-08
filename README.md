# React + FastAPI Virtual Machine Automation Project

This project is a full-stack web application that allows users to request and manage virtual machines using a React frontend and a FastAPI backend. The backend automates the creation and provisioning of Vagrant-managed VMs using Terraform and SSH.

---

## 🌐 Features

- 🔐 User-friendly interface for requesting VMs
- ⚙️ Backend automation with Terraform and Vagrant
- 📡 SSH provisioning and service setup (e.g., nginx)
- 📁 Clean separation of frontend and backend code
- 📦 Easy local development setup

---

## 📁 Project Structure


---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Python 3.10+
- pip / poetry
- Vagrant
- Terraform
- VirtualBox (or another provider)

---

### 🔧 Backend Setup (FastAPI)

1. Navigate to the backend folder:

   ```bash
   cd backend

python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

uvicorn main:app --reload

cd frontend

npm install

npm run dev

or 
npm start

You may need to change the environment settings
for frontend
VITE_API_URL=http://localhost:8000
for backend(.env or hardcode for now)
VM_STORAGE_PATH=/path/to/vm/files


🖥️ VM Provisioning Flow
User fills out VM request form (name, box, CPU, memory).

React frontend sends data to FastAPI backend.

Backend writes Vagrantfile + Terraform files.

Backend triggers terraform init and terraform apply.

SSH provisioning installs required services (e.g., nginx).

VM is ready for use.


🤝 Contributions
Contributions, bug reports, and feature requests are welcome! Please open an issue or submit a pull request.
