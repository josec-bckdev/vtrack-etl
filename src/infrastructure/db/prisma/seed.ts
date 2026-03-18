import "dotenv/config";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { prisma } from "../prismaClient";

interface ZoneYaml {
  zone_id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  alert_type: string;
}

interface ZonesFile {
  zones: ZoneYaml[];
}

async function seedTimeBands(): Promise<void> {
  console.log("Seeding time bands...");

  const bands = [
    { code: "AM", label: "Morning Pickup",     start_hour: 10, end_hour: 15 },
    { code: "PM", label: "Afternoon Dropoff",  start_hour: 20, end_hour: 22 },
  ];

  for (const band of bands) {
    await prisma.timeBand.upsert({
      where:  { code: band.code },
      update: band,
      create: band,
    });
  }

  console.log(`✓ ${bands.length} time bands seeded`);
}

async function seedZones(): Promise<void> {
  console.log("Seeding zones...");

  const yamlPath = path.join(process.cwd(), "data", "zones.yaml");
  const fileContents = fs.readFileSync(yamlPath, "utf8");
  const parsed = yaml.load(fileContents) as ZonesFile;

  for (const zone of parsed.zones) {
    await prisma.zone.upsert({
      where:  { zone_id: zone.zone_id },
      update: {
        name:      zone.name,
        latitude:  zone.latitude,
        longitude: zone.longitude,
        radius_m:  zone.radius_meters,
        alert_type: zone.alert_type,
      },
      create: {
        zone_id:   zone.zone_id,
        name:      zone.name,
        latitude:  zone.latitude,
        longitude: zone.longitude,
        radius_m:  zone.radius_meters,
        alert_type: zone.alert_type,
      },
    });
  }

  console.log(`✓ ${parsed.zones.length} zones seeded`);
}

async function main(): Promise<void> {
  console.log("Starting seed...");
  await seedTimeBands();
  await seedZones();
  console.log("Seed complete ✓");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });