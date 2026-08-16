import { Injectable } from '@nestjs/common';
import { Plugin } from '@prisma/client';
import { readFile } from 'fs/promises';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class PluginLoaderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Load plugin manifest from specified path
   */
  async loadPluginFromPath(path: string): Promise<any> {
    try {
      // Read and parse manifest.json
      const manifestRaw = await readFile(path, 'utf-8');
      return JSON.parse(manifestRaw);
    } catch (error) {
      throw new Error(
        `Failed to load plugin manifest from ${path}: ${error.message}`,
      );
    }
  }

  /**
   * Validate plugin manifest structure
   */
  async validateManifest(
    manifest: any,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!manifest.name || typeof manifest.name !== 'string') {
      errors.push('Plugin name is required and must be a string');
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      errors.push('Plugin version is required and must be a string');
    }

    if (!manifest.main) {
      errors.push('Plugin manifest.main is required');
    }

    if (!manifest.manifest) {
      errors.push('Plugin manifest.manifest is required');
    }

    // Validate manifest entries
    if (!manifest.entries || !Array.isArray(manifest.entries)) {
      errors.push('Plugin manifest.entries is required and must be an array');
    }

    const requiredManifestKeys = [
      'name',
      'type',
      'entry',
      'file',
      'permissions',
      'dependencies',
    ];
    for (const entry of manifest.entries || []) {
      if (!entry.file) {
        errors.push(`Manifest entry "${entry.name}" must specify a file`);
      }

      if (!entry.type) {
        errors.push(
          `Manifest entry "${entry.name}" must specify a type (component, provider, theme)`,
        );
      }

      // Validate permissions structure
      if (entry.permissions && !Array.isArray(entry.permissions)) {
        errors.push(`Permissions for "${entry.name}" must be an array`);
      }

      for (const perm of entry.permissions || []) {
        if (!perm.permission) {
          errors.push(
            `Permission for "${entry.name}" must specify a permission string`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Load plugin code into isolated environment
   */
  async loadPluginById(pluginId: string): Promise<any> {
    const plugin = await this.prisma.plugin.findUnique({
      where: { id: pluginId },
    });

    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    return this.loadPluginCode(plugin);
  }

  /**
   * Load plugin code into isolated environment
   */
  async loadPluginCode(plugin: Plugin): Promise<any> {
    // In a real implementation, this would:
    // 1. Load plugin code from file system
    // 2. Create isolated context (Node.js vm or worker_threads)
    // 3. Load dependencies
    // 4. Execute plugin's entry point

    // For now, just return a placeholder
    const manifest = (plugin.manifest as Record<string, any>) || {};
    return {
      loaded: true,
      context: {},
      entryPoint: manifest.main || 'index.js',
    };
  }

  /**
   * Validate plugin before loading
   */
  async validatePlugin(
    plugin: Plugin,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const manifestErrors: string[] = [];

    if (!plugin.enabled) {
      manifestErrors.push('Plugin cannot be loaded if disabled');
    }

    // Check permissions
    const permissions = await this.prisma.pluginPermission.findMany({
      where: { pluginId: plugin.id },
    });

    const grantedPermissions = permissions
      .filter((perm: any) => perm.granted)
      .map((perm: any) => perm.permission);

    if (grantedPermissions.length === 0) {
      manifestErrors.push(
        `Plugin "${plugin.name}" requires at least one granted permission`,
      );
    }

    const manifestValid = await this.validateManifest(plugin.manifest);

    return {
      valid: manifestErrors.length === 0,
      errors: [...manifestErrors, ...manifestValid.errors],
    };
  }
}
