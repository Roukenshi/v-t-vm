Documentation on Terraform and Vagrant

Pre-requisites:
•	Must have virtual machine (eg. Oracle Virtual Box)
https://www.virtualbox.org/wiki/Downloads

•	Must have installed Vagrant
 	https://www.vagrantup.com/downloads

•	Must have installed Terraform
 	https://developer.hashicorp.com/terraform/install

Process:
	The user needs to create a folder for the project and download both, the vagrant and terraform in the folder. Additionally, the user also will need to make a new folder called vagrant in the folder and place the VagrantFile in the vagrant folder inside the project folder.
•	Alert: Before performing any of the process, the user will need to run vagrant init in Windows PowerShell. This will create the VagrantFile that is needed to automatically create a Virtual Machine and put the VagrantFile in the vagrant folder for it to work with terraform commands.

Some common commands used:
•	terraform init 
•	terraform apply
•	terraform destroy (to run vagrant destroy -f and destroy the VM)

Functionality of the commands:
•	terraform init: Initializes the backend, downloads the required providers like hashicorp/null or aws, sets up modules (if added from GitHub, terraform registry, local path etc.), locks provider versions, provides the directory.
•	terraform apply: Reads the terraform configuration (*.tf files), plans what actions need to be taken (add, change, destroy), prompts for approval (unless you are running -auto-approve), executes the plan
•	terraform destroy: destroys the created Virtual Machine after asking for approval (unless you are using -auto-approve).
