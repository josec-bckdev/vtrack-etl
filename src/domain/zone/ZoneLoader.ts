import fs from "fs";
import yaml from "js-yaml";
import { Zone, ZoneData, createZone } from "./Zone";

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

export function loadZones(filePath: string): Zone[] {
  try {
    const contents = fs.readFileSync(filePath, "utf8");
    const parsed = yaml.load(contents) as ZonesFile;

    return parsed.zones.map((z): Zone => {
      const data: ZoneData = {
        zone_id:    z.zone_id,
        name:       z.name,
        latitude:   z.latitude,
        longitude:  z.longitude,
        radius_m:   z.radius_meters,
        alert_type: z.alert_type,
        enabled:    true,
      };
      return createZone(data);
    });
  } catch (error) {
    throw new Error(`Failed to load zones from ${filePath}: ${error}`);
  }
}