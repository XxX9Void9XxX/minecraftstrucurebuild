const nbt = require('prismarine-nbt');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST allowed' });
    }

    try {
        const { blocks, size } = req.body;

        // 1. Find all the unique block IDs used in the build
        const uniqueBlockIds = [...new Set(blocks.map(b => b.id))];

        // 2. Create the "Palette" (A list of blocks the structure block needs to know about)
        const blockPalette = uniqueBlockIds.map(id => ({
            name: nbt.string(id),
            states: nbt.comp({}),
            version: nbt.int(17959425) // Minecraft Bedrock format version requirement
        }));

        // 3. Create the grid (-1 means empty air)
        const blockIndices = new Array(size[0] * size[1] * size[2]).fill(-1);
        
        // 4. Place the blocks in the grid based on their palette index
        blocks.forEach(b => {
            const index = (b.x * size[1] * size[2]) + (b.y * size[2]) + b.z;
            const paletteIndex = uniqueBlockIds.indexOf(b.id);
            
            if (index >= 0 && index < blockIndices.length) {
                blockIndices[index] = paletteIndex;
            }
        });

        // 5. Build the final .mcstructure NBT file
        const structureNbt = nbt.comp({
            format_version: nbt.int(1),
            size: nbt.list(nbt.int([size[0], size[1], size[2]])),
            structure_world_origin: nbt.list(nbt.int([0, 0, 0])),
            structure: nbt.comp({
                block_indices: nbt.list(nbt.list(nbt.int(blockIndices))), 
                entities: nbt.list(nbt.comp([])),
                palette: nbt.comp({
                    default: nbt.comp({
                        block_palette: nbt.list(nbt.comp(blockPalette)),
                        block_position_data: nbt.comp({})
                    })
                })
            })
        });

        const buffer = nbt.writeUncompressed(structureNbt, 'little');

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment; filename="my_build.mcstructure"');
        res.send(buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate structure' });
    }
}
