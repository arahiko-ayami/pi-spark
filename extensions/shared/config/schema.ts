import * as z from "zod";

import { editorConfigSchema } from "../../editor/config";
import { footerConfigSchema } from "../../footer/config";
import { recapConfigSchema } from "../../recap/config";
import { presetsConfigSchema } from "../../presets/config";

export const configSchemas = {
  editor: editorConfigSchema,
  footer: footerConfigSchema,
  recap: recapConfigSchema,
  presets: presetsConfigSchema,
};

export type ConfigField = keyof typeof configSchemas;
export type ConfigValue<Field extends ConfigField> = z.infer<(typeof configSchemas)[Field]>;
