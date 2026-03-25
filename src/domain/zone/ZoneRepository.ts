/*what the application layer actually needs from zones at runtime?

We decided ZoneLoader reads from YAML at startup. 
The zone table exists for relational integrity (the FK from route_geopoint) and future querying, 
not for loading zones into the detector. 

So at runtime, the application layer calls ZoneLoader.loadZones() directly 
— no repository needed for reads.
The only runtime DB operation involving zones is implicit — 

when saveGeopoints writes a route_geopoint row with a zone_id FK, Postgres validates it against the zone table automatically.
So the honest question is: 

what would ZoneRepository actually do at runtime that isn't already covered?
The answer right now is: nothing. The seed handles writes via prisma directly, the detector uses in-memory zones from YAML, and FK integrity is enforced by the DB.
This means ZoneRepository is premature — we don't need it yet. When the prediction query layer arrives and needs to join geopoints with zone metadata, we add it then.
*/




