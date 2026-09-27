import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const publicDir = path.resolve("public");
const outputDir = path.join(publicDir, "optimized");
const equipmentDir = path.join(publicDir, "equipment");
const outputEquipmentDir = path.join(outputDir, "equipment");

await fs.mkdir(outputEquipmentDir, { recursive: true });

const equipmentFiles = (await fs.readdir(equipmentDir))
  .filter((name) => /\.(png|jpe?g)$/i.test(name));

for (const name of equipmentFiles) {
  await sharp(path.join(equipmentDir, name))
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 72, effort: 4 })
    .toFile(path.join(outputEquipmentDir, name.replace(/\.(png|jpe?g)$/i, ".webp")));
}

await sharp(path.join(publicDir, "hero-bg.png"))
  .resize({ width: 1600, withoutEnlargement: true })
  .webp({ quality: 78, effort: 4 })
  .toFile(path.join(outputDir, "hero-bg.webp"));

await sharp(path.join(publicDir, "anchor.svg"))
  .resize({ width: 512, height: 512, fit: "contain" })
  .webp({ quality: 82, effort: 4 })
  .toFile(path.join(outputDir, "anchor.webp"));

console.log(`Prepared ${equipmentFiles.length} equipment images + hero image in public/optimized.`);
