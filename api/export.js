const nbt = require('prismarine-nbt');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST allowed' });
    }

    try {
        const { blocks, size } = req.body;

        // Minecraft Bedrock requires a very specific NBT schema for .mcstructure files
        // We set up a palette and an array of block indices
        const blockIndices = new Array(size[0] * size[1] * size[2]).fill(-1); // -1 is air
        
        // Map blocks to the 1D array Bedrock expects
        blocks.forEach(b => {
            // Index formula: (x * size_y * size_z) + (y * size_z) + z
            const index = (b.x * size[1] * size[2]) + (b.y * size[2]) + b.z;
            if (index >= 0 && index < blockIndices.length) {
                blockIndices[index] = 0; // 0 points to the first item in our palette (Stone)
            }
        });

        // The exact NBT tree structure Minecraft Bedrock expects
        const structureNbt = nbt.comp({
            format_version: nbt.int(1),
            size: nbt.list(nbt.int([size[0], size[1], size[2]])),
            structure_world_origin: nbt.list(nbt.int([0, 0, 0])),
            structure: nbt.comp({
                block_indices: nbt.list(nbt.list(nbt.int(blockIndices))), // Layer 0 (Blocks)
                entities: nbt.list(nbt.comp([])),
                palette: nbt.comp({
                    default: nbt.comp({
                        block_palette: nbt.list(nbt.comp([
                            {
                                name: nbt.string("minecraft:stone"),
                                states: nbt.comp({}),
                                version: nbt.int(17959425) 
                            }
                        ])),
                        block_position_data: nbt.comp({})
                    })
                })
            })
        });

        // Convert the NBT object to a Little Endian binary buffer
        const buffer = nbt.writeUncompressed(structureNbt, 'little');

        // Send the file back to the browser
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment; filename="my_build.mcstructure"');
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate structure' });
    }
}
