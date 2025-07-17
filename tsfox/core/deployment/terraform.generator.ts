/**
 * Terraform Infrastructure Templates Generator
 * Creates cloud-specific Terraform configurations
 */

import * as fs from 'fs';
import * as path from 'path';
import { DeploymentConfig } from './deployment.manager';

export class TerraformGenerator {
  
  /**
   * Generate Terraform configuration for AWS
   */
  static generateAWSTerraform(config: DeploymentConfig): string {
    return `
# AWS Infrastructure for Fox Framework
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "${config.region}"
}

# Variables
variable "app_name" {
  description = "Application name"
  type        = string
  default     = "${config.appName}"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "${config.environment}"
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "\${var.app_name}-vpc"
    Environment = var.environment
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "\${var.app_name}-igw"
    Environment = var.environment
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.\${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name        = "\${var.app_name}-public-subnet-\${count.index + 1}"
    Environment = var.environment
  }
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "\${var.app_name}-public-rt"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Group for ALB
resource "aws_security_group" "alb" {
  name_prefix = "\${var.app_name}-alb-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "\${var.app_name}-alb-sg"
    Environment = var.environment
  }
}

# Security Group for ECS Tasks
resource "aws_security_group" "ecs_tasks" {
  name_prefix = "\${var.app_name}-ecs-tasks-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "\${var.app_name}-ecs-tasks-sg"
    Environment = var.environment
  }
}

# ECR Repository
resource "aws_ecr_repository" "app" {
  name                 = var.app_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = var.app_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Environment = var.environment
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "\${var.app_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false

  tags = {
    Environment = var.environment
  }
}

# Target Group
resource "aws_lb_target_group" "app" {
  name        = "\${var.app_name}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    path                = "/health"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Environment = var.environment
  }
}

# Load Balancer Listener
resource "aws_lb_listener" "app" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# IAM Role for ECS Tasks
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "\${var.app_name}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/\${var.app_name}"
  retention_in_days = 7

  tags = {
    Environment = var.environment
  }
}

# ECS Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = var.app_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "${config.scaling?.minInstances || 256}"
  memory                   = "${(config.scaling?.minInstances || 256) * 2}"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = var.app_name
      image = "\${aws_ecr_repository.app.repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.app.name
          awslogs-region        = "${config.region}"
          awslogs-stream-prefix = "ecs"
        }
      }

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "3000"
        }
      ]
    }
  ])

  tags = {
    Environment = var.environment
  }
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = var.app_name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = ${config.scaling?.minInstances || 1}
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = aws_subnet.public[*].id
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = var.app_name
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.app]

  tags = {
    Environment = var.environment
  }
}

# Auto Scaling
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = ${config.scaling?.maxInstances || 3}
  min_capacity       = ${config.scaling?.minInstances || 1}
  resource_id        = "service/\${aws_ecs_cluster.main.name}/\${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_policy_cpu" {
  name               = "\${var.app_name}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = ${config.scaling?.targetCPU || 70}
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

${config.database ? `
# Database subnet group
resource "aws_db_subnet_group" "main" {
  name       = "\${var.app_name}-db-subnet-group"
  subnet_ids = aws_subnet.public[*].id

  tags = {
    Name        = "\${var.app_name}-db-subnet-group"
    Environment = var.environment
  }
}

# Security group for database
resource "aws_security_group" "database" {
  name_prefix = "\${var.app_name}-db-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "\${var.app_name}-db-sg"
    Environment = var.environment
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "postgresql" {
  identifier             = "\${var.app_name}-postgres"
  engine                 = "postgres"
  engine_version         = "13.13"
  instance_class         = "${config.database?.size || 'db.t3.micro'}"
  allocated_storage      = 20
  storage_encrypted      = true

  db_name  = var.app_name
  username = "postgres"
  password = "changeme123!"

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = true

  tags = {
    Name        = "\${var.app_name}-postgres"
    Environment = var.environment
  }
}
` : ''}

# Outputs
output "load_balancer_url" {
  description = "URL of the load balancer"
  value       = "http://\${aws_lb.main.dns_name}"
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = aws_ecs_service.app.name
}

${config.database ? `
output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.postgresql.endpoint
}

output "database_connection_string" {
  description = "Database connection string"
  value       = "postgresql://postgres:changeme123!@\${aws_db_instance.postgresql.endpoint}/\${var.app_name}"
}
` : ''}
`;
  }

  /**
   * Generate Terraform configuration for GCP
   */
  static generateGCPTerraform(config: DeploymentConfig): string {
    return `
# GCP Infrastructure for Fox Framework
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  region = "${config.region}"
}

# Variables
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "${config.appName}"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "${config.environment}"
}

# Enable required APIs
resource "google_project_service" "cloud_run_api" {
  service = "run.googleapis.com"
}

resource "google_project_service" "container_registry_api" {
  service = "containerregistry.googleapis.com"
}

resource "google_project_service" "cloud_build_api" {
  service = "cloudbuild.googleapis.com"
}

# Cloud Run Service
resource "google_cloud_run_service" "app" {
  name     = var.app_name
  location = "${config.region}"

  template {
    spec {
      containers {
        image = "gcr.io/\${var.project_id}/\${var.app_name}:latest"
        
        ports {
          container_port = 3000
        }

        env {
          name  = "NODE_ENV"
          value = var.environment
        }

        env {
          name  = "PORT"
          value = "3000"
        }

        resources {
          limits = {
            cpu    = "${config.scaling?.targetCPU || 1000}m"
            memory = "${(config.scaling?.minInstances || 512)}Mi"
          }
        }
      }

      container_concurrency = 100
      timeout_seconds      = 300
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/minScale" = "${config.scaling?.minInstances || 1}"
        "autoscaling.knative.dev/maxScale" = "${config.scaling?.maxInstances || 10}"
        "run.googleapis.com/cpu-throttling" = "false"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [google_project_service.cloud_run_api]
}

# IAM policy to allow public access
resource "google_cloud_run_service_iam_member" "public" {
  service  = google_cloud_run_service.app.name
  location = google_cloud_run_service.app.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

${config.database ? `
# Cloud SQL Instance (if database is enabled)
resource "google_sql_database_instance" "main" {
  name             = "\${var.app_name}-db"
  database_version = "${config.database.type.toUpperCase()}_13"
  region           = "${config.region}"

  settings {
    tier = "${config.database.size || 'db-f1-micro'}"
    
    backup_configuration {
      enabled    = true
      start_time = "03:00"
    }

    ip_configuration {
      ipv4_enabled = true
      authorized_networks {
        value = "0.0.0.0/0"
        name  = "all"
      }
    }
  }

  deletion_protection = false
}

resource "google_sql_database" "database" {
  name     = var.app_name
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "user" {
  name     = "\${var.app_name}_user"
  instance = google_sql_database_instance.main.name
  password = "changeme123!"
}
` : ''}

# Output values
output "service_url" {
  description = "URL of the Cloud Run service"
  value       = google_cloud_run_service.app.status[0].url
}

output "container_registry_url" {
  description = "URL for pushing container images"
  value       = "gcr.io/\${var.project_id}/\${var.app_name}"
}

${config.database ? `
output "database_connection_string" {
  description = "Database connection string"
  value       = "postgresql://\${google_sql_user.user.name}:\${google_sql_user.user.password}@\${google_sql_database_instance.main.connection_name}/\${google_sql_database.database.name}"
  sensitive   = true
}
` : ''}
`;
  }

  /**
   * Generate Terraform configuration for Azure
   */
  static generateAzureTerraform(config: DeploymentConfig): string {
    return `
# Azure Infrastructure for Fox Framework
terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Variables
variable "app_name" {
  description = "Application name"
  type        = string
  default     = "${config.appName}"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "${config.environment}"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "${config.region}"
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "\${var.app_name}-rg"
  location = var.location

  tags = {
    Environment = var.environment
    Project     = var.app_name
  }
}

# Container Registry
resource "azurerm_container_registry" "acr" {
  name                = "\${replace(var.app_name, "-", "")}acr"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = true

  tags = {
    Environment = var.environment
  }
}

# Container Instance
resource "azurerm_container_group" "main" {
  name                = "\${var.app_name}-ci"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  ip_address_type     = "Public"
  dns_name_label      = "\${var.app_name}-\${var.environment}"
  os_type             = "Linux"

  container {
    name   = var.app_name
    image  = "\${azurerm_container_registry.acr.login_server}/\${var.app_name}:latest"
    cpu    = "${(config.scaling?.targetCPU || 1000) / 1000}"
    memory = "${(config.scaling?.minInstances || 512) / 1024}"

    ports {
      port     = 3000
      protocol = "TCP"
    }

    environment_variables = {
      NODE_ENV = var.environment
      PORT     = "3000"
    }

    liveness_probe {
      http_get {
        path   = "/health"
        port   = 3000
        scheme = "Http"
      }
      initial_delay_seconds = 30
      period_seconds       = 10
      timeout_seconds      = 5
      success_threshold    = 1
      failure_threshold    = 3
    }

    readiness_probe {
      http_get {
        path   = "/health/ready"
        port   = 3000
        scheme = "Http"
      }
      initial_delay_seconds = 5
      period_seconds       = 5
      timeout_seconds      = 3
      success_threshold    = 1
      failure_threshold    = 3
    }
  }

  image_registry_credential {
    server   = azurerm_container_registry.acr.login_server
    username = azurerm_container_registry.acr.admin_username
    password = azurerm_container_registry.acr.admin_password
  }

  tags = {
    Environment = var.environment
  }
}

${config.database ? `
# Azure Database for PostgreSQL
resource "azurerm_postgresql_server" "main" {
  name                = "\${var.app_name}-db"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  administrator_login          = "\${var.app_name}admin"
  administrator_login_password = "H@Sh1CoR3!"

  sku_name   = "${config.database?.size || 'B_Gen5_1'}"
  version    = "11"
  storage_mb = 5120

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false
  auto_grow_enabled           = true

  public_network_access_enabled    = true
  ssl_enforcement_enabled          = true
  ssl_minimal_tls_version_enforced = "TLS1_2"

  tags = {
    Environment = var.environment
  }
}

resource "azurerm_postgresql_database" "main" {
  name                = var.app_name
  resource_group_name = azurerm_resource_group.main.name
  server_name         = azurerm_postgresql_server.main.name
  charset             = "UTF8"
  collation           = "English_United States.1252"
}

resource "azurerm_postgresql_firewall_rule" "main" {
  name                = "AllowAllWindowsAzureIps"
  resource_group_name = azurerm_resource_group.main.name
  server_name         = azurerm_postgresql_server.main.name
  start_ip_address    = "0.0.0.0"
  end_ip_address      = "0.0.0.0"
}
` : ''}

# Outputs
output "container_url" {
  description = "URL of the container instance"
  value       = "http://\${azurerm_container_group.main.fqdn}:3000"
}

output "container_registry_url" {
  description = "URL of the container registry"
  value       = azurerm_container_registry.acr.login_server
}

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

${config.database ? `
output "database_connection_string" {
  description = "Database connection string"
  value       = "postgresql://\${azurerm_postgresql_server.main.administrator_login}:\${azurerm_postgresql_server.main.administrator_login_password}@\${azurerm_postgresql_server.main.fqdn}:5432/\${azurerm_postgresql_database.main.name}"
  sensitive   = true
}
` : ''}
`;
  }

  /**
   * Generate Kubernetes manifests
   */
  static generateKubernetesManifests(config: DeploymentConfig): string {
    return `
# Kubernetes Deployment and Service for Fox Framework
apiVersion: v1
kind: Namespace
metadata:
  name: ${config.appName}-${config.environment}
  labels:
    app: ${config.appName}
    environment: ${config.environment}

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${config.appName}
  namespace: ${config.appName}-${config.environment}
  labels:
    app: ${config.appName}
    environment: ${config.environment}
spec:
  replicas: ${config.scaling?.minInstances || 2}
  selector:
    matchLabels:
      app: ${config.appName}
  template:
    metadata:
      labels:
        app: ${config.appName}
        environment: ${config.environment}
    spec:
      containers:
      - name: ${config.appName}
        image: ${config.appName}:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "${config.environment}"
        - name: PORT
          value: "3000"
        resources:
          requests:
            memory: "${(config.scaling?.minInstances || 256)}Mi"
            cpu: "${(config.scaling?.targetCPU || 250)}m"
          limits:
            memory: "${(config.scaling?.minInstances || 256) * 2}Mi"
            cpu: "${(config.scaling?.targetCPU || 250) * 2}m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3

---
apiVersion: v1
kind: Service
metadata:
  name: ${config.appName}-service
  namespace: ${config.appName}-${config.environment}
  labels:
    app: ${config.appName}
    environment: ${config.environment}
spec:
  selector:
    app: ${config.appName}
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  type: ClusterIP

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${config.appName}-hpa
  namespace: ${config.appName}-${config.environment}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${config.appName}
  minReplicas: ${config.scaling?.minInstances || 2}
  maxReplicas: ${config.scaling?.maxInstances || 10}
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: ${config.scaling?.targetCPU || 70}
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

${config.domain ? `
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${config.appName}-ingress
  namespace: ${config.appName}-${config.environment}
  labels:
    app: ${config.appName}
    environment: ${config.environment}
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    ${config.ssl ? 'cert-manager.io/cluster-issuer: "letsencrypt-prod"' : ''}
spec:
  ${config.ssl ? `
  tls:
  - hosts:
    - ${config.domain}
    secretName: ${config.appName}-tls` : ''}
  rules:
  - host: ${config.domain}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${config.appName}-service
            port:
              number: 80
` : ''}
`;
  }

  /**
   * Write Terraform files to disk
   */
  static writeTerraformFiles(
    deploymentDir: string, 
    config: DeploymentConfig
  ): void {
    const terraformDir = path.join(deploymentDir, 'terraform');
    
    if (!fs.existsSync(terraformDir)) {
      fs.mkdirSync(terraformDir, { recursive: true });
    }

    // Generate and write provider-specific files
    switch (config.provider) {
      case 'aws':
        fs.writeFileSync(
          path.join(terraformDir, 'main.tf'), 
          this.generateAWSTerraform(config)
        );
        break;
      case 'gcp':
        fs.writeFileSync(
          path.join(terraformDir, 'main.tf'), 
          this.generateGCPTerraform(config)
        );
        break;
      case 'azure':
        fs.writeFileSync(
          path.join(terraformDir, 'main.tf'), 
          this.generateAzureTerraform(config)
        );
        break;
      case 'kubernetes':
        fs.writeFileSync(
          path.join(deploymentDir, 'k8s-manifests.yaml'), 
          this.generateKubernetesManifests(config)
        );
        break;
    }

    console.log(`✅ Generated Terraform configuration for ${config.provider}`);
  }
}

export default TerraformGenerator;
