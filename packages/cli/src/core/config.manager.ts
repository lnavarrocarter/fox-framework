// tsfox/cli/core/config.manager.ts
import fs from 'fs';
import path from 'path';
import { ProjectConfig } from '../interfaces/cli.interface';

export class ConfigManager {
  private static readonly CONFIG_FILENAME = 'fox.config.json';
  private static readonly PACKAGE_JSON = 'package.json';

  /**
   * Load project configuration
   */
  async loadProjectConfig(projectRoot?: string): Promise<ProjectConfig | null> {
    const root = projectRoot || process.cwd();
    const configPath = path.join(root, ConfigManager.CONFIG_FILENAME);

    if (fs.existsSync(configPath)) {
      try {
        const configContent = await fs.promises.readFile(configPath, 'utf8');
        return JSON.parse(configContent);
      } catch (error) {
        console.warn(`Failed to parse config file: ${configPath}`);
        return null;
      }
    }

    // Fallback to package.json fox config
    const packagePath = path.join(root, ConfigManager.PACKAGE_JSON);
    if (fs.existsSync(packagePath)) {
      try {
        const packageContent = await fs.promises.readFile(packagePath, 'utf8');
        const packageJson = JSON.parse(packageContent);
        
        if (packageJson.fox) {
          return {
            name: packageJson.name,
            version: packageJson.version,
            framework: packageJson.fox.framework || { version: '1.0.0', features: [] },
            ...packageJson.fox
          };
        }
      } catch (error) {
        console.warn(`Failed to parse package.json: ${packagePath}`);
      }
    }

    return null;
  }

  /**
   * Save project configuration
   */
  async saveProjectConfig(config: ProjectConfig, projectRoot?: string): Promise<void> {
    const root = projectRoot || process.cwd();
    const configPath = path.join(root, ConfigManager.CONFIG_FILENAME);

    try {
      const configContent = JSON.stringify(config, null, 2);
      await fs.promises.writeFile(configPath, configContent, 'utf8');
    } catch (error: any) {
      throw new Error(`Failed to save config: ${error.message}`);
    }
  }

  /**
   * Initialize configuration for new project
   */
  async initializeConfig(projectName: string, options: any = {}): Promise<ProjectConfig> {
    const config: ProjectConfig = {
      name: projectName,
      version: '1.0.0',
      framework: {
        version: this.getFrameworkVersion(),
        features: this.getEnabledFeatures(options)
      }
    };

    if (options.database) {
      config.database = {
        provider: options.database,
        connection: this.getDefaultDatabaseConfig(options.database)
      };
    }

    if (options.docker || options.cloud) {
      config.deployment = {
        type: options.docker ? 'docker' : 'cloud',
        config: {}
      };
    }

    return config;
  }

  /**
   * Update configuration
   */
  async updateConfig(
    updates: Partial<ProjectConfig>,
    projectRoot?: string
  ): Promise<ProjectConfig | null> {
    const currentConfig = await this.loadProjectConfig(projectRoot);
    
    if (!currentConfig) {
      throw new Error('No configuration found to update');
    }

    const updatedConfig = { ...currentConfig, ...updates };
    await this.saveProjectConfig(updatedConfig, projectRoot);
    
    return updatedConfig;
  }

  /**
   * Check if project is Fox Framework project
   */
  async isFoxProject(projectRoot?: string): Promise<boolean> {
    const config = await this.loadProjectConfig(projectRoot);
    return config !== null;
  }

  /**
   * Get framework version
   */
  private getFrameworkVersion(): string {
    try {
      const packagePath = path.resolve(__dirname, '../../../package.json');
      const packageContent = fs.readFileSync(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  /**
   * Get enabled features based on options
   */
  private getEnabledFeatures(options: any): string[] {
    const features: string[] = ['core', 'router', 'templates'];

    if (options.auth) features.push('auth');
    if (options.database) features.push('database');
    if (options.cache) features.push('cache');
    if (options.validation) features.push('validation');
    if (options.logging) features.push('logging');
    if (options.events) features.push('events');

    return features;
  }

  /**
   * Get default database configuration
   */
  private getDefaultDatabaseConfig(provider: string): Record<string, any> {
    switch (provider) {
      case 'postgresql':
        return {
          host: 'localhost',
          port: 5432,
          database: 'foxdb',
          username: 'fox',
          password: ''
        };

      case 'mysql':
        return {
          host: 'localhost',
          port: 3306,
          database: 'foxdb',
          username: 'fox',
          password: ''
        };

      case 'sqlite':
        return {
          filename: './database.sqlite'
        };

      case 'mongodb':
        return {
          url: 'mongodb://localhost:27017/foxdb'
        };

      default:
        return {};
    }
  }

  /**
   * Get global CLI configuration
   */
  async getGlobalConfig(): Promise<any> {
    const globalConfigDir = path.join(require('os').homedir(), '.fox');
    const globalConfigPath = path.join(globalConfigDir, 'config.json');

    if (!fs.existsSync(globalConfigPath)) {
      return {};
    }

    try {
      const content = await fs.promises.readFile(globalConfigPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  /**
   * Save global CLI configuration
   */
  async saveGlobalConfig(config: any): Promise<void> {
    const globalConfigDir = path.join(require('os').homedir(), '.fox');
    const globalConfigPath = path.join(globalConfigDir, 'config.json');

    // Ensure directory exists
    await fs.promises.mkdir(globalConfigDir, { recursive: true });

    const content = JSON.stringify(config, null, 2);
    await fs.promises.writeFile(globalConfigPath, content, 'utf8');
  }
}
