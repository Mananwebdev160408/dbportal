import Docker from "dockerode";

const docker = new Docker();

async function debug() {
  try {
    console.log("Pinging docker daemon...");
    await docker.ping();
    console.log("Ping successful!");
    
    console.log("Listing containers...");
    const containers = await docker.listContainers({ all: true });
    console.log(`Found ${containers.length} containers.`);
    
    // Attempt map logic
    containers.map((c, idx) => {
      try {
        const rawName = c.Names[0] || "";
        const name = rawName.startsWith("/") ? rawName.slice(1) : rawName;
        const ports = c.Ports.map((p) => {
          if (p.PublicPort) {
            const ipStr = p.IP ? (p.IP === "::" ? "[::]" : p.IP) + ":" : "";
            return `${ipStr}${p.PublicPort}->${p.PrivatePort}/${p.Type}`;
          }
          return `${p.PrivatePort}/${p.Type}`;
        });
      } catch (err) {
        console.error(`Error mapping container at index ${idx} (ID: ${c.Id}):`);
        console.error(err);
        console.log("Container raw data:", JSON.stringify(c, null, 2));
        throw err;
      }
    });
    console.log("All containers mapped successfully in mock run!");
  } catch (err) {
    console.error("FATAL DEBUG ERROR:");
    console.error(err);
  }
}

debug();
