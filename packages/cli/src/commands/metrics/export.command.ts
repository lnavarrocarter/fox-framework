// tsfox/cli/commands/metrics/export.command.ts
import { CommandInterface, CLIContext, ValidationResult } from '../interfaces/cli.interface';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

export const MetricsExportCommand: CommandInterface = {
  name: 'export',
  description: 'Export metrics from running application',
  arguments: [],
  options: [
    {
      name: 'url',
      alias: 'u',
      description: 'Base URL of the application',
      type: 'string',
      default: 'http://localhost:3000'
    },
    {
      name: 'endpoint',
      alias: 'e',
      description: 'Metrics endpoint path',
      type: 'string',
      default: '/metrics'
    },
    {
      name: 'format',
      alias: 'f',
      description: 'Export format (prometheus|json)',
      type: 'string',
      default: 'prometheus',
      choices: ['prometheus', 'json']
    },
    {
      name: 'output',
      alias: 'o',
      description: 'Output file path',
      type: 'string'
    },
    {
      name: 'timeout',
      alias: 't',
      description: 'Request timeout in milliseconds',
      type: 'number',
      default: 10000
    }
  ],

  validate: (args, options): ValidationResult => {
    if (options.timeout && options.timeout <= 0) {
      return {
        valid: false,
        message: 'Timeout must be greater than 0'
      };
    }
    return { valid: true };
  },

  async action(args, options, context: CLIContext): Promise<void> {
    console.log('📊 Exporting Fox Framework Metrics...');
    
    try {
      const baseUrl = options.url || 'http://localhost:3000';
      const endpoint = options.endpoint || '/metrics';
      const format = options.format || 'prometheus';
      const timeout = options.timeout || 10000;
      
      console.log(`🔍 Fetching from: ${baseUrl}${endpoint}`);
      console.log(`📋 Format: ${format}`);
      console.log(`⏱️  Timeout: ${timeout}ms`);
      console.log('');
      
      const startTime = Date.now();
      
      // Fetch metrics
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        timeout,
        params: { format },
        validateStatus: () => true
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.status !== 200) {
        console.error(`❌ Failed to fetch metrics: ${response.status} ${response.statusText}`);
        process.exit(1);
      }
      
      console.log(`✅ Metrics fetched successfully (${responseTime}ms)`);
      
      // Process metrics data
      const metricsData = response.data;
      let outputContent: string;
      let fileExtension: string;
      
      if (format === 'json') {
        outputContent = typeof metricsData === 'string' 
          ? metricsData 
          : JSON.stringify(metricsData, null, 2);
        fileExtension = 'json';
      } else {
        outputContent = typeof metricsData === 'object' 
          ? JSON.stringify(metricsData, null, 2) 
          : metricsData;
        fileExtension = 'txt';
      }
      
      // Determine output file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultFileName = `fox-metrics-${timestamp}.${fileExtension}`;
      const outputFile = options.output || path.join(context.projectRoot, defaultFileName);
      
      // Write to file if output specified, otherwise display
      if (options.output || !process.stdout.isTTY) {
        fs.writeFileSync(outputFile, outputContent);
        console.log(`📁 Metrics exported to: ${outputFile}`);
        
        // Show file info
        const stats = fs.statSync(outputFile);
        console.log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`);
      } else {
        // Display to console
        console.log('📊 Metrics Data:');
        console.log('═'.repeat(50));
        
        if (format === 'json') {
          try {
            const parsed = typeof metricsData === 'string' 
              ? JSON.parse(metricsData) 
              : metricsData;
            
            if (parsed.timestamp) {
              console.log(`📅 Timestamp: ${parsed.timestamp}`);
            }
            
            if (parsed.metrics) {
              console.log(`📈 Metrics Count: ${Object.keys(parsed.metrics).length}`);
              
              // Show sample metrics
              const sampleMetrics = Object.entries(parsed.metrics).slice(0, 5);
              if (sampleMetrics.length > 0) {
                console.log('\n📋 Sample Metrics:');
                sampleMetrics.forEach(([key, value]) => {
                  console.log(`   ${key}: ${JSON.stringify(value)}`);
                });
                
                if (Object.keys(parsed.metrics).length > 5) {
                  console.log(`   ... and ${Object.keys(parsed.metrics).length - 5} more`);
                }
              }
            }
            
            console.log('\n📄 Full JSON:');
            console.log(JSON.stringify(parsed, null, 2));
          } catch (error) {
            console.log(outputContent);
          }
        } else {
          // Prometheus format
          const lines = outputContent.split('\n');
          const metricLines = lines.filter((line: string) => line && !line.startsWith('#'));
          
          console.log(`📈 Total Metrics: ${metricLines.length}`);
          console.log(`📝 Lines: ${lines.length}`);
          
          // Show first few metrics
          const sampleLines = lines.slice(0, 10);
          if (sampleLines.length > 0) {
            console.log('\n📋 Sample Metrics:');
            sampleLines.forEach((line: string) => {
              if (line.trim()) {
                console.log(`   ${line}`);
              }
            });
            
            if (lines.length > 10) {
              console.log(`   ... and ${lines.length - 10} more lines`);
            }
          }
        }
      }
      
      // Show summary
      console.log('\n📊 Export Summary:');
      console.log(`✅ Status: Success`);
      console.log(`⏱️  Response Time: ${responseTime}ms`);
      console.log(`📋 Format: ${format}`);
      console.log(`📅 Exported: ${new Date().toISOString()}`);
      
      console.log('\n🦊 Metrics export completed!');
      
    } catch (error) {
      console.error('❌ Metrics export failed:', axios.isAxiosError(error) ? error.message : error);
      process.exit(1);
    }
  }
};
