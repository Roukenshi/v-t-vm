terraform {
  required_providers {
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

provider "null" {}

# Run vagrant up
resource "null_resource" "vagrant_up" {
   triggers = {
    always_run = timestamp()
  }
  provisioner "local-exec" {
    command     = "vagrant up"
    working_dir = "${path.module}/vagrant"
  }
}

# Provision VM via SSH after vagrant up
resource "null_resource" "provision_vm" {
  depends_on = [null_resource.vagrant_up]

  provisioner "remote-exec" {
    inline = [
      "sudo apt update",
      "sudo apt install -y nginx"
    ]

    connection {
      type        = "ssh"
      host        = "127.0.0.1"
      user        = "vagrant"
      private_key = "${abspath("${path.module}/vagrant/.vagrant/machines/default/virtualbox/private_key")}"
      port        = 2222
      # optionally add ssh agent forwarding, timeout, etc.
    }
  }
}

# Run vagrant destroy on terraform destroy
resource "null_resource" "vagrant_destroy" {
  triggers = {
    always_run = timestamp()
  }
  provisioner "local-exec" {
    command     = "vagrant destroy -f"
    working_dir = "${path.module}/vagrant"
    when        = destroy
  }

  # Ensure destroy runs after provisioning is complete
  depends_on = [null_resource.provision_vm]
}
