import { Inject, Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ILlmProvider } from "../interfaces/llm-provider.interface";

export const LLM_PROVIDERS = Symbol("LLM_PROVIDERS");

@Injectable()
export class LlmProviderRegistry implements OnModuleInit {
  private readonly logger = new Logger(LlmProviderRegistry.name);
  private readonly providers = new Map<string, ILlmProvider>();
  private defaultProviderId!: string;

  constructor(
    @Inject(LLM_PROVIDERS)
    private readonly providerList: ILlmProvider[],
    private readonly configService: ConfigService,
  ) {}

  public onModuleInit(): void {
    this.logger.log("Initializing LlmProviderRegistry...");

    // 1. Register providers and validate duplicates
    for (const provider of this.providerList) {
      const desc = provider.descriptor;
      if (!desc || !desc.id) {
        throw new Error("LLM Provider missing valid descriptor metadata.");
      }

      const id = desc.id.toLowerCase();
      if (this.providers.has(id)) {
        throw new Error(
          `Duplicate LLM provider registration detected: ${desc.id}`,
        );
      }
      this.providers.set(id, provider);
    }

    // Print startup registry log details
    this.logger.log("Registered Providers:");
    for (const provider of this.providers.values()) {
      const isPlaceholder = provider.constructor.name
        .toLowerCase()
        .includes("placeholder");
      const suffix = isPlaceholder ? " (placeholder)" : "";
      this.logger.log(`- ${provider.descriptor.displayName}${suffix}`);
    }

    // 2. Resolve default provider from configuration
    const configDefault =
      this.configService.get<string>("DEFAULT_LLM_PROVIDER") || "gemini";
    this.defaultProviderId = configDefault.toLowerCase();

    this.logger.log(`Default Provider: ${this.defaultProviderId}`);

    // Validate configured default exists in the registry
    if (!this.providers.has(this.defaultProviderId)) {
      throw new Error(
        `Unknown DEFAULT_LLM_PROVIDER configured: ${this.defaultProviderId}`,
      );
    }
  }

  /**
   * Resolves a provider by its unique identifier.
   */
  public get(id: string): ILlmProvider {
    const resolved = this.providers.get(id.toLowerCase());
    if (!resolved) {
      throw new Error(`Unknown LLM provider requested: ${id}`);
    }
    return resolved;
  }

  /**
   * Resolves the default configured provider.
   */
  public getDefault(): ILlmProvider {
    return this.get(this.defaultProviderId);
  }

  /**
   * Exposes all registered providers.
   */
  public getAll(): ILlmProvider[] {
    return Array.from(this.providers.values());
  }
}
