import { Injectable, Logger } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { PrismaService } from '@/core/database/prisma.service';
import { AIWorkflowRun, AIWorkflowStep } from '@prisma/client';
import { PluginLoaderService } from '../../plugins/runtime/plugin-loader.service';
import { SandboxService } from '../../plugins/sandbox/sandbox.service';

interface ExecutionStep {
  step: AIWorkflowStep;
  context: Record<string, unknown>;
}

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    private workflowEngine: WorkflowEngineService,
    private prisma: PrismaService,
    private messageBus: MessageBusService,
    private pluginLoader: PluginLoaderService,
    private sandbox: SandboxService,
  ) {}

  /**
   * Execute a workflow run
   */
  async executeWorkflowRun(runId: string): Promise<void> {
    this.logger.log(`Starting workflow execution: ${runId}`);

    try {
      // Get workflow run and steps
      const run = await this.prisma.aIWorkflowRun.findUnique({
        where: { id: runId },
        include: { workflow: true },
      });

      if (!run || !run.workflow) {
        throw new Error(`Workflow run ${runId} not found`);
      }

      const steps = await this.workflowEngine.getWorkflowSteps(run.workflowId);

      // Build execution context
      const context: Record<string, unknown> = {
        runId,
        workflowKey: run.workflow.key,
        projectId: run.projectId,
        taskId: run.taskId,
        ...((run.input as Record<string, unknown>) || {}),
      };

      // Execute steps sequentially
      for (const step of steps) {
        this.logger.log(`Executing step: ${step.id} (${step.stepType})`);

        try {
          const result = await this.executeStep(step, context);

          // Update context with step output
          context[`step_${step.id}_output`] = result.output;

          // Publish progress event
          await this.messageBus.publish('workflow.progress', {
            workflowRunId: runId,
            stepId: step.id,
            status: 'completed',
            output: result.output,
          });
        } catch (error) {
          this.logger.error(`Step ${step.id} failed:`, error);

          await this.workflowEngine.updateRunStatus(
            runId,
            'failed',
            undefined,
            `Step ${step.stepType} failed: ${error instanceof Error ? error.message : String(error)}`,
          );

          // Publish error event
          await this.messageBus.publish('workflow.error', {
            workflowRunId: runId,
            stepId: step.id,
            error: error instanceof Error ? error.message : String(error),
          });

          return;
        }
      }

      // Mark workflow as succeeded
      await this.workflowEngine.updateRunStatus(runId, 'succeeded', {
        stepsExecuted: steps.length,
      });

      await this.messageBus.publish('workflow.completed', {
        workflowRunId: runId,
        result: context,
      });

      this.logger.log(`Workflow execution completed: ${runId}`);
    } catch (error) {
      this.logger.error(`Workflow execution failed: ${runId}`, error);

      try {
        await this.workflowEngine.updateRunStatus(
          runId,
          'failed',
          undefined,
          error instanceof Error ? error.message : String(error),
        );
      } catch (updateError) {
        this.logger.error('Failed to update run status:', updateError);
      }
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: AIWorkflowStep,
    context: Record<string, unknown>,
  ): Promise<{ output: any; error?: any }> {
    const config = step.config as any;

    switch (step.stepType) {
      case 'llm':
        return await this.executeLLMStep(config, context);

      case 'code':
        return await this.executeCodeStep(config, context);

      case 'condition':
        return await this.executeConditionStep(config, context);

      case 'http':
        return await this.executeHttpStep(config, context);

      case 'plugin':
        return await this.executePluginStep(config, context);

      default:
        throw new Error(`Unknown step type: ${step.stepType}`);
    }
  }

  /**
   * Execute LLM step
   */
  private async executeLLMStep(config: any, context: Record<string, unknown>) {
    // TODO: Call AI Hub service to execute LLM
    this.logger.log('Executing LLM step', config);

    // Placeholder for now
    return { output: { result: 'LLM placeholder' } };
  }

  /**
   * Execute code step
   */
  private async executeCodeStep(config: any, context: Record<string, unknown>) {
    // TODO: Execute JavaScript code safely
    this.logger.log('Executing code step', config);

    // Placeholder for now
    return { output: { result: 'Code placeholder' } };
  }

  /**
   * Execute condition step
   */
  private async executeConditionStep(
    config: any,
    context: Record<string, unknown>,
  ) {
    // TODO: Evaluate condition expression
    this.logger.log('Evaluating condition', config);

    const result = this.evaluateExpression(config.expression, context);

    return { output: { result } };
  }

  /**
   * Execute HTTP step
   */
  private async executeHttpStep(config: any, context: Record<string, unknown>) {
    // TODO: Make HTTP request
    this.logger.log('Executing HTTP step', config);

    // Placeholder for now
    return { output: { result: 'HTTP placeholder' } };
  }

  /**
   * Execute plugin step
   */
  private async executePluginStep(
    config: any,
    context: Record<string, unknown>,
  ) {
    // TODO: Execute plugin in sandbox
    this.logger.log('Executing plugin step', config);

    if (!config.pluginId) {
      throw new Error('Plugin ID is required for plugin step');
    }

    // Load plugin and execute
    const plugin = await this.pluginLoader.loadPluginById(config.pluginId);

    const result = await this.sandbox.execute(
      config.pluginId,
      config.entryPoint || 'main',
      { ...context, stepConfig: config },
    );

    return { output: result.output };
  }

  /**
   * Evaluate expression (simple JS evaluation for conditions)
   */
  private evaluateExpression(
    expression: string,
    context: Record<string, unknown>,
  ): boolean {
    try {
      // TODO: Safe expression evaluation
      const fn = new Function('context', `return ${expression}`);
      return fn(context);
    } catch (error) {
      throw new Error(`Failed to evaluate expression: ${expression}`);
    }
  }
}
