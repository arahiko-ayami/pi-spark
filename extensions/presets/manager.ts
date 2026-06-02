import { PRESET_CHANGE } from "../shared/events";
import { formatModel } from "../shared/format";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { PresetsConfig, PresetConfig } from "./config";

export class PresetManager {
  private pi: ExtensionAPI;
  private presets: PresetsConfig;
  private active: string | undefined = undefined;

  constructor(pi: ExtensionAPI, presets: PresetsConfig) {
    this.pi = pi;
    this.presets = presets;
  }

  get keys(): string[] {
    return Object.keys(this.presets);
  }

  isActive(ctx: ExtensionContext, key: string): boolean {
    return key === this.getActive(ctx);
  }

  sync(ctx: ExtensionContext): void {
    const active = this.getActive(ctx);
    if (active === this.active) return;

    this.active = active;
    this.pi.events.emit(PRESET_CHANGE, active);
  }

  async apply(key: string, ctx: ExtensionContext): Promise<boolean> {
    const preset = this.presets[key];
    if (!preset) {
      ctx.ui.notify(`Unknown preset ${key}`, "error");
      return false;
    }

    const model = ctx.modelRegistry.find(preset.provider, preset.model);
    if (!model) {
      ctx.ui.notify(`Preset ${key}: model ${preset.provider}/${preset.model} not found`, "error");
      return false;
    }

    const success = await this.pi.setModel(model);
    if (!success) {
      ctx.ui.notify(`Preset ${key}: no API key for ${preset.provider}/${preset.model}`, "error");
      return false;
    }

    this.pi.setThinkingLevel(preset.thinkingLevel);

    const active = this.getActive(ctx);
    this.active = active;
    this.pi.events.emit(PRESET_CHANGE, active);

    if (active === key) {
      ctx.ui.notify(`Preset: ${key} (${this.describe(key)})`, "info");
    } else {
      ctx.ui.notify(`Preset ${key}: thinking level ${preset.thinkingLevel} was clamped to ${this.pi.getThinkingLevel()}`, "warning");
    }

    return true;
  }

  async cycle(ctx: ExtensionContext, direction: "forward" | "backward"): Promise<void> {
    if (this.keys.length === 0) {
      ctx.ui.notify("No presets defined in spark.json", "warning");
      return;
    }

    const currentKey = this.getActive(ctx);
    const currentIndex = currentKey ? this.keys.indexOf(currentKey) : -1;
    const step = direction === "forward" ? 1 : -1;
    const nextIndex = currentIndex === -1 ? direction === "forward" ? 0 : this.keys.length - 1 : (currentIndex + step + this.keys.length) % this.keys.length;
    const nextKey = this.keys[nextIndex];
    if (!nextKey) return;

    await this.apply(nextKey, ctx);
  }

  describe(key: string): string {
    const preset = this.presets[key];
    return preset ? formatModel(preset.provider, preset.model, preset.thinkingLevel) : "";
  }

  private getActive(ctx: ExtensionContext): string | undefined {
    const current = this.getCurrentPreset(ctx);
    if (!current) return undefined;

    return this.keys.find((key) => {
      const preset = this.presets[key];
      if (!preset) return false;

      return preset.provider === current.provider && preset.model === current.model && preset.thinkingLevel === current.thinkingLevel;
    });
  }

  private getCurrentPreset(ctx: ExtensionContext): PresetConfig | undefined {
    if (!ctx.model) return undefined;

    return {
      provider: ctx.model.provider,
      model: ctx.model.id,
      thinkingLevel: this.pi.getThinkingLevel(),
    };
  }
}
