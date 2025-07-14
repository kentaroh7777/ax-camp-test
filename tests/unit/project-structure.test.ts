import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('プロジェクト基盤構築', () => {
  it('manifest.jsonが正しく作成されている', () => {
    const manifestPath = path.join(process.cwd(), 'chrome-extension/manifest.json')
    expect(fs.existsSync(manifestPath)).toBe(true)
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    expect(manifest.manifest_version).toBe(3)
    expect(manifest.name).toBe('Multi-Channel Reply Assistant')
    expect(manifest.permissions).toContain('storage')
    expect(manifest.permissions).toContain('identity')
    expect(manifest.background.service_worker).toBe('background/service-worker.js')
  })

  it('package.jsonにテストスクリプトが設定されている', () => {
    const packagePath = path.join(process.cwd(), 'chrome-extension/package.json')
    expect(fs.existsSync(packagePath)).toBe(true)
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
    expect(packageJson.scripts.test).toBeDefined()
    expect(packageJson.scripts.test).toContain('vitest')
  })

  it('TypeScript設定が正しく作成されている', () => {
    const tsconfigPath = path.join(process.cwd(), 'chrome-extension/tsconfig.json')
    expect(fs.existsSync(tsconfigPath)).toBe(true)
    
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'))
    expect(tsconfig.compilerOptions.target).toBe('ES2020')
    expect(tsconfig.compilerOptions.strict).toBe(true)
    expect(tsconfig.compilerOptions.paths).toBeDefined()
  })

  it('webpack設定が正しく作成されている', () => {
    const webpackPath = path.join(process.cwd(), 'chrome-extension/webpack.config.js')
    expect(fs.existsSync(webpackPath)).toBe(true)
  })

  it('vitest設定が正しく作成されている', () => {
    const vitestPath = path.join(process.cwd(), 'vitest.config.ts')
    expect(fs.existsSync(vitestPath)).toBe(true)
  })
})