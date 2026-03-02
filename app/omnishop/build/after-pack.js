/**
 * electron-builder afterPack hook.
 * Removes Electron runtime files that OmniShop doesn't need,
 * reducing the unpacked size and final installer size.
 */
const { join } = require('path')
const { rmSync, existsSync } = require('fs')

const REMOVE = [
  // DirectX shader compiler — only needed for WebGPU / D3D12 shaders (unused)
  'dxcompiler.dll',
  'dxil.dll'
]

module.exports = async function afterPack(context) {
  const { appOutDir } = context
  for (const file of REMOVE) {
    const fullPath = join(appOutDir, file)
    if (existsSync(fullPath)) {
      rmSync(fullPath)
      console.log(`  • afterPack: removed ${file}`)
    }
  }
}
