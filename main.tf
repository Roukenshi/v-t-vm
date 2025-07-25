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