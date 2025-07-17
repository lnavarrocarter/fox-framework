/**
 * Helm Chart Generator for Fox Framework
 * Creates Kubernetes Helm charts for simplified deployment
 */

import * as fs from 'fs';
import * as path from 'path';
import { DeploymentConfig } from './deployment.manager';

export class HelmChartGenerator {
  
  /**
   * Generate complete Helm chart structure
   */
  static generateHelmChart(
    outputDir: string, 
    config: DeploymentConfig
  ): void {
    const chartDir = path.join(outputDir, 'helm-chart');
    
    // Create chart directory structure
    this.createChartStructure(chartDir);
    
    // Generate chart files
    this.generateChartYaml(chartDir, config);
    this.generateValuesYaml(chartDir, config);
    this.generateDeploymentTemplate(chartDir, config);
    this.generateServiceTemplate(chartDir, config);
    this.generateIngressTemplate(chartDir, config);
    this.generateConfigMapTemplate(chartDir, config);
    this.generateHPATemplate(chartDir, config);
    
    console.log(`✅ Helm chart generated at ${chartDir}`);
  }

  /**
   * Create Helm chart directory structure
   */
  private static createChartStructure(chartDir: string): void {
    const dirs = [
      chartDir,
      path.join(chartDir, 'templates'),
      path.join(chartDir, 'charts'),
      path.join(chartDir, 'templates', 'tests')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate Chart.yaml file
   */
  private static generateChartYaml(chartDir: string, config: DeploymentConfig): void {
    const chartYaml = `
apiVersion: v2
name: ${config.appName}
description: Fox Framework Application Helm Chart
type: application
version: 1.0.0
appVersion: "1.0.0"

keywords:
  - fox-framework
  - typescript
  - nodejs
  - web-framework

home: https://github.com/fox-framework/fox-framework
sources:
  - https://github.com/fox-framework/fox-framework

maintainers:
  - name: Fox Framework Team
    email: team@fox-framework.com

dependencies: []

annotations:
  category: Web Framework
  licenses: MIT
`.trim();

    fs.writeFileSync(path.join(chartDir, 'Chart.yaml'), chartYaml);
  }

  /**
   * Generate values.yaml file
   */
  private static generateValuesYaml(chartDir: string, config: DeploymentConfig): void {
    const valuesYaml = `
# Default values for ${config.appName}
# This is a YAML-formatted file.

# Application configuration
app:
  name: ${config.appName}
  version: "1.0.0"
  environment: ${config.environment}

# Image configuration
image:
  repository: ${config.appName}
  pullPolicy: IfNotPresent
  tag: "latest"

# Image pull secrets
imagePullSecrets: []

# Service account
serviceAccount:
  create: true
  annotations: {}
  name: ""

# Pod annotations
podAnnotations: {}

# Pod security context
podSecurityContext: {}

# Container security context
securityContext: {}

# Service configuration
service:
  type: ClusterIP
  port: 80
  targetPort: 3000

# Ingress configuration
ingress:
  enabled: ${config.domain ? 'true' : 'false'}
  className: "nginx"
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    ${config.ssl ? 'cert-manager.io/cluster-issuer: "letsencrypt-prod"' : ''}
  hosts:
    - host: ${config.domain || 'chart-example.local'}
      paths:
        - path: /
          pathType: Prefix
  tls:
    ${config.ssl ? `
    - secretName: ${config.appName}-tls
      hosts:
        - ${config.domain}` : '[]'}

# Resource limits and requests
resources:
  limits:
    cpu: ${(config.scaling?.targetCPU || 500) * 2}m
    memory: ${(config.scaling?.minInstances || 512) * 2}Mi
  requests:
    cpu: ${config.scaling?.targetCPU || 250}m
    memory: ${config.scaling?.minInstances || 256}Mi

# Horizontal Pod Autoscaler
autoscaling:
  enabled: true
  minReplicas: ${config.scaling?.minInstances || 2}
  maxReplicas: ${config.scaling?.maxInstances || 10}
  targetCPUUtilizationPercentage: ${config.scaling?.targetCPU || 70}
  targetMemoryUtilizationPercentage: 80

# Node selector
nodeSelector: {}

# Tolerations
tolerations: []

# Affinity
affinity: {}

# Environment variables
env:
  - name: NODE_ENV
    value: "${config.environment}"
  - name: PORT
    value: "3000"
  ${config.monitoring ? `
  - name: METRICS_ENABLED
    value: "true"` : ''}

# Config map data
configMap:
  data:
    app.env: "${config.environment}"
    log.level: "info"
    ${config.monitoring ? 'metrics.enabled: "true"' : ''}

# Persistent volume claim
persistence:
  enabled: false
  storageClass: ""
  accessMode: ReadWriteOnce
  size: 8Gi

# Health checks
healthCheck:
  enabled: true
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

${config.database ? `
# Database configuration
database:
  enabled: true
  type: ${config.database.type}
  host: ""
  port: ${config.database.type === 'postgresql' ? 5432 : config.database.type === 'mysql' ? 3306 : 27017}
  name: ${config.appName}
  username: ${config.appName}_user
  existingSecret: ""
  secretKeys:
    password: password` : ''}

# Monitoring and observability
monitoring:
  enabled: ${config.monitoring || false}
  serviceMonitor:
    enabled: ${config.monitoring || false}
    labels: {}
    interval: 30s
    path: /metrics
    port: 3000

# Additional labels
labels: {}

# Additional annotations
annotations: {}
`.trim();

    fs.writeFileSync(path.join(chartDir, 'values.yaml'), valuesYaml);
  }

  /**
   * Generate deployment template
   */
  private static generateDeploymentTemplate(chartDir: string, config: DeploymentConfig): void {
    const deploymentTemplate = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "${config.appName}.fullname" . }}
  labels:
    {{- include "${config.appName}.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount | default 2 }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "${config.appName}.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      {{- with .Values.podAnnotations }}
      annotations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      labels:
        {{- include "${config.appName}.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "${config.appName}.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          securityContext:
            {{- toYaml .Values.securityContext | nindent 12 }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.targetPort }}
              protocol: TCP
          {{- if .Values.healthCheck.enabled }}
          livenessProbe:
            {{- toYaml .Values.healthCheck.livenessProbe | nindent 12 }}
          readinessProbe:
            {{- toYaml .Values.healthCheck.readinessProbe | nindent 12 }}
          {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          env:
            {{- toYaml .Values.env | nindent 12 }}
          {{- if .Values.configMap }}
          envFrom:
            - configMapRef:
                name: {{ include "${config.appName}.fullname" . }}-config
          {{- end }}
          {{- if .Values.persistence.enabled }}
          volumeMounts:
            - name: data
              mountPath: /app/data
          {{- end }}
      {{- if .Values.persistence.enabled }}
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: {{ include "${config.appName}.fullname" . }}-pvc
      {{- end }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
`.trim();

    fs.writeFileSync(
      path.join(chartDir, 'templates', 'deployment.yaml'), 
      deploymentTemplate
    );
  }

  /**
   * Generate service template
   */
  private static generateServiceTemplate(chartDir: string, config: DeploymentConfig): void {
    const serviceTemplate = `
apiVersion: v1
kind: Service
metadata:
  name: {{ include "${config.appName}.fullname" . }}
  labels:
    {{- include "${config.appName}.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "${config.appName}.selectorLabels" . | nindent 4 }}
`.trim();

    fs.writeFileSync(
      path.join(chartDir, 'templates', 'service.yaml'), 
      serviceTemplate
    );
  }

  /**
   * Generate ingress template
   */
  private static generateIngressTemplate(chartDir: string, config: DeploymentConfig): void {
    const ingressTemplate = `
{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "${config.appName}.fullname" . }}
  labels:
    {{- include "${config.appName}.labels" . | nindent 4 }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- if .Values.ingress.className }}
  ingressClassName: {{ .Values.ingress.className }}
  {{- end }}
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "${config.appName}.fullname" $ }}
                port:
                  number: {{ $.Values.service.port }}
          {{- end }}
    {{- end }}
{{- end }}
`.trim();

    fs.writeFileSync(
      path.join(chartDir, 'templates', 'ingress.yaml'), 
      ingressTemplate
    );
  }

  /**
   * Generate ConfigMap template
   */
  private static generateConfigMapTemplate(chartDir: string, config: DeploymentConfig): void {
    const configMapTemplate = `
{{- if .Values.configMap }}
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "${config.appName}.fullname" . }}-config
  labels:
    {{- include "${config.appName}.labels" . | nindent 4 }}
data:
  {{- toYaml .Values.configMap.data | nindent 2 }}
{{- end }}
`.trim();

    fs.writeFileSync(
      path.join(chartDir, 'templates', 'configmap.yaml'), 
      configMapTemplate
    );
  }

  /**
   * Generate HPA template
   */
  private static generateHPATemplate(chartDir: string, config: DeploymentConfig): void {
    const hpaTemplate = `
{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "${config.appName}.fullname" . }}
  labels:
    {{- include "${config.appName}.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "${config.appName}.fullname" . }}
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
    {{- if .Values.autoscaling.targetCPUUtilizationPercentage }}
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetCPUUtilizationPercentage }}
    {{- end }}
    {{- if .Values.autoscaling.targetMemoryUtilizationPercentage }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetMemoryUtilizationPercentage }}
    {{- end }}
{{- end }}
`.trim();

    fs.writeFileSync(
      path.join(chartDir, 'templates', 'hpa.yaml'), 
      hpaTemplate
    );
  }

  /**
   * Generate helper templates
   */
  static generateHelperTemplates(chartDir: string, config: DeploymentConfig): void {
    const helpersTemplate = `
{{/*
Expand the name of the chart.
*/}}
{{- define "${config.appName}.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "${config.appName}.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "${config.appName}.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "${config.appName}.labels" -}}
helm.sh/chart: {{ include "${config.appName}.chart" . }}
{{ include "${config.appName}.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "${config.appName}.selectorLabels" -}}
app.kubernetes.io/name: {{ include "${config.appName}.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "${config.appName}.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "${config.appName}.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
`.trim();

    fs.writeFileSync(
      path.join(chartDir, 'templates', '_helpers.tpl'), 
      helpersTemplate
    );
  }

  /**
   * Generate test templates
   */
  static generateTestTemplates(chartDir: string, config: DeploymentConfig): void {
    const testTemplate = `
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "${config.appName}.fullname" . }}-test"
  labels:
    {{- include "${config.appName}.labels" . | nindent 4 }}
  annotations:
    "helm.sh/hook": test
spec:
  restartPolicy: Never
  containers:
    - name: wget
      image: busybox
      command: ['wget']
      args: ['{{ include "${config.appName}.fullname" . }}:{{ .Values.service.port }}/health']
`.trim();

    fs.writeFileSync(
      path.join(chartDir, 'templates', 'tests', 'test-connection.yaml'), 
      testTemplate
    );
  }

  /**
   * Generate complete Helm chart with all components
   */
  static generateCompleteChart(
    outputDir: string, 
    config: DeploymentConfig
  ): void {
    this.generateHelmChart(outputDir, config);
    
    const chartDir = path.join(outputDir, 'helm-chart');
    this.generateHelperTemplates(chartDir, config);
    this.generateTestTemplates(chartDir, config);
    
    // Generate additional templates if needed
    if (config.database) {
      this.generateDatabaseTemplates(chartDir, config);
    }
    
    if (config.monitoring) {
      this.generateMonitoringTemplates(chartDir, config);
    }
    
    console.log(`🎉 Complete Helm chart generated at ${chartDir}`);
  }

  /**
   * Generate database-related templates
   */
  private static generateDatabaseTemplates(chartDir: string, config: DeploymentConfig): void {
    const secretTemplate = `
{{- if .Values.database.enabled }}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "${config.appName}.fullname" . }}-db-secret
  labels:
    {{- include "${config.appName}.labels" . | nindent 4 }}
type: Opaque
data:
  {{- if not .Values.database.existingSecret }}
  password: {{ .Values.database.password | b64enc | quote }}
  {{- end }}
{{- end }}
`.trim();

    fs.writeFileSync(
      path.join(chartDir, 'templates', 'secret.yaml'), 
      secretTemplate
    );
  }

  /**
   * Generate monitoring templates
   */
  private static generateMonitoringTemplates(chartDir: string, config: DeploymentConfig): void {
    const serviceMonitorTemplate = `
{{- if and .Values.monitoring.enabled .Values.monitoring.serviceMonitor.enabled }}
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: {{ include "${config.appName}.fullname" . }}
  labels:
    {{- include "${config.appName}.labels" . | nindent 4 }}
    {{- with .Values.monitoring.serviceMonitor.labels }}
    {{- toYaml . | nindent 4 }}
    {{- end }}
spec:
  selector:
    matchLabels:
      {{- include "${config.appName}.selectorLabels" . | nindent 6 }}
  endpoints:
    - port: http
      path: {{ .Values.monitoring.serviceMonitor.path }}
      interval: {{ .Values.monitoring.serviceMonitor.interval }}
{{- end }}
`.trim();

    fs.writeFileSync(
      path.join(chartDir, 'templates', 'servicemonitor.yaml'), 
      serviceMonitorTemplate
    );
  }
}

export default HelmChartGenerator;
