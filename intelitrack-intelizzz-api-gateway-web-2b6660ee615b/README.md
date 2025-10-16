# Simple Koa Based API Gateway

## How to use

1. Fork/Clone
1. Install dependencies - `npm install`
1. Sanity check - `npm start`
1. Test - `npm test`
1. Create new microservice and re-initialise git for new repo

## Example services.json file

```json
{
  "services": [
    {
      "path": "/",
      "url": "dockerfiles_example-service_1",
      "types": ["get"]
    },
    {
      "path": "/hello",
      "url": "http://localhost:3000",
      "mockResponse": { "message":  "Hello, I'm a mock response." },
      "types": ["get", "post"]
    }
  ]
}
```

# Setting up Rancher (Kubernetes)

If you need Kubernetes infrastructure, use the following instructions to setup Rancher, which is an easy way to orchestrate containers and manage Kubernetes.

### Installing Docker

Follow the relevant instructions on the Docker website to install Docker for the target OS.
```bash
# Optional installation instructions if on Ubuntu and you want to run docker without sudo:

$ sudo chown $(whoami):docker /home/$(whoami)/.docker/config.json
```

### Ubuntu Specific

If Ubuntu is the target OS, make sure swap is disabled by running `swapoff -a` and removing any swap entry in `/etc/fstab`.

### Setup the User Account

Use the following instructions to setup the user account:

```bash
# Login to the node (replace theuser and thenode with appropriate username and hostname/IP)
$ ssh theuser@thenode

# Optionally create a new Linux user (e.g. rke), create the home directory and add to the docker group

$ sudo groupadd docker
$ sudo gpasswd -a $USER docker

# Switch to new user if you created one, then create the SSH directories
$ mkdir $HOME/.ssh
$ chmod 700 $HOME/.ssh
$ touch $HOME/.ssh/authorized_keys

# Test Docker socket access
$ docker version
Client:
 Version:           18.09.7
 API version:       1.39
 Go version:        go1.10.1
 Git commit:        2d0083d
 Built:             Wed Jul  3 12:13:59 2019
 OS/Arch:           linux/amd64
 Experimental:      false

Server:
 Engine:
  Version:          18.09.7
  API version:      1.39 (minimum version 1.12)
  Go version:       go1.10.1
  Git commit:       2d0083d
  Built:            Mon Jul  1 19:31:12 2019
  OS/Arch:          linux/amd64
  Experimental:     false
```

### Configure SSH keys

If you have existing keys you can re-use them, however, the following are instructions to setup new keys.

```bash
$ ssh-keygen
Generating public/private rsa key pair.
Enter file in which to save the key (/home/theadmin/.ssh/id_rsa): 
Enter passphrase (empty for no passphrase): 
Enter same passphrase again: 
Your identification has been saved in /home/theadmin/.ssh/id_rsa.
Your public key has been saved in /home/theadmin/.ssh/id_rsa.pub.
The key fingerprint is:
xxx
```

Copy the resulting `$HOME/.ssh/id_rsa.pub` public key onto any other nodes intended to be part of the cluster.

Execute the following for each of the nodes (or use `ssh-copy-id` if using the SSH user on each node as the rke user):

```bash
# Install the SSH public key on the node
$ cat $HOME/.ssh/id_rsa.pub | ssh hostname "sudo tee -a /home/rke/.ssh/authorized_keys"
```

Execute the following (if a passphrase was used):

```bash
# Run ssh-agent and configure the correct environment variables
$ eval $(ssh-agent)
Agent pid 5151
# Add the private key to the ssh-agent
$ ssh-add $HOME/.ssh/id_rsa
Identity added: $HOME/.ssh/id_rsa ($HOME/.ssh/id_rsa)
```


Test SSH private key:
```bash
$ ssh -i $HOME/.ssh/id_rsa user@hostname docker version
  Client:
   Version:           18.09.7
   API version:       1.39
   Go version:        go1.10.1
   Git commit:        2d0083d
   Built:             Wed Jul  3 12:13:59 2019
   OS/Arch:           linux/amd64
   Experimental:      false
  
  Server:
   Engine:
    Version:          18.09.7
    API version:      1.39 (minimum version 1.12)
    Go version:       go1.10.1
    Git commit:       2d0083d
    Built:            Mon Jul  1 19:31:12 2019
    OS/Arch:          linux/amd64
    Experimental:     false
```

### Installing RKE

First install the latest version of of RKE (go to https://github.com/rancher/rke/releases to get the latest tag).

Download the latest binary for your OS using wget, replacing `<tag>` and `<binary-release>` with actual release tag and binary release name.

```bash
# $ wget https://github.com/rancher/rke/releases/download/<tag>/<binary-release>
# For example: 

$ wget https://github.com/rancher/rke/releases/download/v0.2.6/rke_linux-amd64
```

Once you've downloaded the binary, make it executable and check it works by checking the version.

```bash
$ chmod +x rke_linux-amd64

$ ./rke_linux-amd64 --version
rke version v0.2.6
```

Finally, make it executable from anywhere, e.g.:

```bash
$ mv rke_linux-amd64 /usr/local/bin/rke

$ sudo mv rke_linux-amd64 /usr/local/bin/rke

$ rke --version
rke version v0.2.6
```

Create cluster.yml by running `rke config` and following the instructions:


```bash
$ rke config
  [+] Cluster Level SSH Private Key Path [~/.ssh/id_rsa]: ~/.ssh/id_rsa
  [+] Number of Hosts [1]: 3
  [+] SSH Address of host (1) [none]: ip_or_dns_host1
  [+] SSH Port of host (1) [22]:
  [+] SSH Private Key Path of host (ip_or_dns_host1) [none]:
  [-] You have entered empty SSH key path, trying fetch from SSH key parameter
  [+] SSH Private Key of host (ip_or_dns_host1) [none]:
  [-] You have entered empty SSH key, defaulting to cluster level SSH key: ~/.ssh/id_rsa
  [+] SSH User of host (ip_or_dns_host1) [ubuntu]: rke
  [+] Is host (ip_or_dns_host1) a Control Plane host (y/n)? [y]: y
  [+] Is host (ip_or_dns_host1) a Worker host (y/n)? [n]: y
  [+] Is host (ip_or_dns_host1) an etcd host (y/n)? [n]: y
  [+] Override Hostname of host (ip_or_dns_host1) [none]:
  [+] Internal IP of host (ip_or_dns_host1) [none]:
  [+] Docker socket path on host (ip_or_dns_host1) [/var/run/docker.sock]:
  [+] SSH Address of host (2) [none]: ip_or_dns_host2
  [+] SSH Port of host (2) [22]:
  [+] SSH Private Key Path of host (ip_or_dns_host2) [none]:
  [-] You have entered empty SSH key path, trying fetch from SSH key parameter
  [+] SSH Private Key of host (ip_or_dns_host2) [none]:
  [-] You have entered empty SSH key, defaulting to cluster level SSH key: ~/.ssh/id_rsa
  [+] SSH User of host (ip_or_dns_host2) [ubuntu]: rke
  [+] Is host (ip_or_dns_host2) a Control Plane host (y/n)? [y]: y
  [+] Is host (ip_or_dns_host2) a Worker host (y/n)? [n]: y
  [+] Is host (ip_or_dns_host2) an etcd host (y/n)? [n]: y
  [+] Override Hostname of host (ip_or_dns_host2) [none]:
  [+] Internal IP of host (ip_or_dns_host2) [none]:
  [+] Docker socket path on host (ip_or_dns_host2) [/var/run/docker.sock]:
  [+] SSH Address of host (3) [none]: ip_or_dns_host3
  [+] SSH Port of host (3) [22]:
  [+] SSH Private Key Path of host (ip_or_dns_host3) [none]:
  [-] You have entered empty SSH key path, trying fetch from SSH key parameter
  [+] SSH Private Key of host (ip_or_dns_host3) [none]:
  [-] You have entered empty SSH key, defaulting to cluster level SSH key: ~/.ssh/id_rsa
  [+] SSH User of host (ip_or_dns_host3) [ubuntu]: rke
  [+] Is host (ip_or_dns_host3) a Control Plane host (y/n)? [y]: y
  [+] Is host (ip_or_dns_host3) a Worker host (y/n)? [n]: y
  [+] Is host (ip_or_dns_host3) an etcd host (y/n)? [n]: y
  [+] Override Hostname of host (ip_or_dns_host3) [none]:
  [+] Internal IP of host (ip_or_dns_host3) [none]:
  [+] Docker socket path on host (ip_or_dns_host3) [/var/run/docker.sock]:
  [+] Network Plugin Type (flannel, calico, weave, canal) [canal]:
  [+] Authentication Strategy [x509]:
  [+] Authorization Mode (rbac, none) [rbac]:
  [+] Kubernetes Docker image [rancher/hyperkube:v1.11.1-rancher1]:
  [+] Cluster domain [cluster.local]:
  [+] Service Cluster IP Range [10.43.0.0/16]:
  [+] Enable PodSecurityPolicy [n]:
  [+] Cluster Network CIDR [10.42.0.0/16]:
  [+] Cluster DNS Service IP [10.43.0.10]:
  [+] Add addon manifest URLs or YAML files [no]: no
```


