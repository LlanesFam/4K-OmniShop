/**
 * CSV Service
 *
 * Provides export and import utilities for Categories and Products.
 * Import parsing includes validation and forbidden-content checks to prevent
 * malicious input, data breaches, or encoding attacks.
 */

import type { Category, Product } from '@/lib/types'

// ─── Color presets ────────────────────────────────────────────────────────────

export const CATEGORY_COLOR_PRESETS = [
  '#4ade80',
  '#22d3ee',
  '#818cf8',
  '#f472b6',
  '#fb923c',
  '#facc15',
  '#a78bfa',
  '#f87171',
  '#34d399',
  '#60a5fa',
  '#e879f9',
  '#94a3b8'
]

function randomPresetColor(): string {
  return CATEGORY_COLOR_PRESETS[Math.floor(Math.random() * CATEGORY_COLOR_PRESETS.length)]
}

// ─── Forbidden content patterns ───────────────────────────────────────────────
// Blocks: script tags, inline JavaScript, DOM event handlers, common SQL
// injection patterns, shell commands, and eval/exec calls.

const FORBIDDEN_PATTERNS: RegExp[] = [
  /<\s*script[\s/>]/i,
  /javascript\s*:/i,
  /on\w+\s*=/i, // onerror=, onclick=, etc.
  /data\s*:/i, // data: URIs
  /\bDROP\s+TABLE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bINSERT\s+INTO\b/i,
  /\bSELECT\b.+\bFROM\b/i,
  /\bUNION\s+SELECT\b/i,
  /\bEXEC\s*\(/i,
  /\bEXECUTE\s*\(/i,
  /\bEVAL\s*\(/i,
  /\bDOCUMENT\s*\.\s*COOKIE\b/i,
  /\bWINDOW\s*\.\s*LOCATION\b/i,
  /<[^>]+>/g // any remaining HTML tags
]

function isForbidden(value: string): boolean {
  return FORBIDDEN_PATTERNS.some((p) => p.test(value))
}

function sanitize(value: string): string {
  return value.trim().replace(/\r/g, '')
}

// ─── RFC 4180-compliant CSV parser ────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  for (const line of lines) {
    if (!line.trim()) continue
    const cols: string[] = []
    let current = ''
    let inQuote = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuote = !inQuote
        }
      } else if (ch === ',' && !inQuote) {
        cols.push(current)
        current = ''
      } else {
        current += ch
      }
    }
    cols.push(current)
    rows.push(cols)
  }
  return rows
}

function escapeField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeField).join(',')
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface ImportError {
  row: number
  field: string
  message: string
}

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORY_HEADERS = ['name', 'color', 'parentName']

export interface CategoryImportRow {
  row: number
  name: string
  color: string
  parentName: string
  /** True when this name already exists in the catalog or was seen earlier in this CSV */
  isDuplicate: boolean
}

export interface CategoryImportResult {
  valid: CategoryImportRow[]
  errors: ImportError[]
}

export function exportCategoriesToCSV(categories: Category[]): string {
  const idToName = new Map(categories.map((c) => [c.id, c.name]))
  const lines = [CATEGORY_HEADERS.join(',')]
  for (const cat of categories) {
    lines.push(toRow([cat.name, cat.color, cat.parentId ? (idToName.get(cat.parentId) ?? '') : '']))
  }
  return lines.join('\n')
}

export function getCategoryCSVTemplate(): string {
  return [
    CATEGORY_HEADERS.join(','),
    'Electronics,#4ade80,',
    'Phones,#22d3ee,Electronics',
    'Beverages,#f472b6,'
  ].join('\n')
}

export function parseCategoriesCSV(
  text: string,
  existingNames?: Set<string>
): CategoryImportResult {
  const rows = parseCSV(text)
  if (rows.length < 2) {
    return {
      valid: [],
      errors: [{ row: 0, field: 'file', message: 'File is empty or contains only a header row.' }]
    }
  }

  const headers = rows[0].map((h) => h.toLowerCase().trim())
  const nameIdx = headers.indexOf('name')
  const colorIdx = headers.indexOf('color')
  const parentIdx = headers.indexOf('parentname')

  const missingCols: string[] = []
  if (nameIdx === -1) missingCols.push('name')
  if (missingCols.length > 0) {
    return {
      valid: [],
      errors: [
        {
          row: 1,
          field: 'headers',
          message: `Missing required column(s): ${missingCols.join(', ')}`
        }
      ]
    }
  }

  const valid: CategoryImportRow[] = []
  const errors: ImportError[] = []
  // Track names seen so far in this file (lowercase) for within-CSV duplicate detection
  const seenNames = new Set<string>()

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    let hasError = false

    const name = sanitize(row[nameIdx] ?? '')
    const colorRaw = colorIdx !== -1 ? sanitize(row[colorIdx] ?? '') : ''
    const parentName = parentIdx !== -1 ? sanitize(row[parentIdx] ?? '') : ''

    if (!name) {
      errors.push({ row: rowNum, field: 'name', message: 'Name is required.' })
      hasError = true
    } else if (name.length < 2) {
      errors.push({
        row: rowNum,
        field: 'name',
        message: 'Name must be at least 2 characters.'
      })
      hasError = true
    } else if (name.length > 100) {
      errors.push({ row: rowNum, field: 'name', message: 'Name must be 100 characters or less.' })
      hasError = true
    } else if (isForbidden(name)) {
      errors.push({
        row: rowNum,
        field: 'name',
        message: 'Name contains forbidden or unsafe content.'
      })
      hasError = true
    }

    // Color: if missing or invalid hex, silently assign a random preset color
    const color = /^#[0-9a-fA-F]{6}$/.test(colorRaw) ? colorRaw : randomPresetColor()

    if (parentName && isForbidden(parentName)) {
      errors.push({
        row: rowNum,
        field: 'parentName',
        message: 'Parent name contains forbidden content.'
      })
      hasError = true
    }

    if (!hasError) {
      const key = name.toLowerCase()
      const isDuplicate = seenNames.has(key) || (existingNames?.has(key) ?? false)
      if (!isDuplicate) seenNames.add(key)
      valid.push({ row: rowNum, name, color, parentName, isDuplicate })
    }
  }

  return { valid, errors }
}

// ─── Products ─────────────────────────────────────────────────────────────────

const PRODUCT_HEADERS = [
  'name',
  'type',
  'price',
  'description',
  'sku',
  'barcode',
  'stock',
  'categoryName',
  'status'
]

export interface ProductImportRow {
  row: number
  name: string
  type: 'product' | 'service'
  price: number
  description: string
  sku: string
  barcode: string
  stock: number | null
  categoryName: string
  status: 'active' | 'inactive' | 'draft'
  /** True when this name already exists in the catalog or was seen earlier in this CSV */
  isDuplicate: boolean
}

export interface ProductImportResult {
  valid: ProductImportRow[]
  errors: ImportError[]
}

export function exportProductsToCSV(products: Product[], categories: Category[]): string {
  const catIdToName = new Map(categories.map((c) => [c.id, c.name]))
  const lines = [PRODUCT_HEADERS.join(',')]
  for (const p of products) {
    lines.push(
      toRow([
        p.name,
        p.type,
        p.price,
        p.description,
        p.sku,
        p.barcode,
        p.stock ?? '',
        p.categoryId ? (catIdToName.get(p.categoryId) ?? '') : '',
        p.status
      ])
    )
  }
  return lines.join('\n')
}

export function getProductCSVTemplate(): string {
  return [
    PRODUCT_HEADERS.join(','),
    'Iced Latte,product,150,Cold espresso with milk,BEV-001,,50,Beverages,active',
    'Web Design,service,5000,Custom landing page,,,,Services,active',
    'iPhone 15,product,85000,,PHN-001,012345678901,10,Phones,draft'
  ].join('\n')
}

export function parseProductsCSV(text: string, existingNames?: Set<string>): ProductImportResult {
  const rows = parseCSV(text)
  if (rows.length < 2) {
    return {
      valid: [],
      errors: [{ row: 0, field: 'file', message: 'File is empty or contains only a header row.' }]
    }
  }

  const headers = rows[0].map((h) => h.toLowerCase().trim())
  const idx = (col: string): number => headers.indexOf(col)

  const nameIdx = idx('name')
  const typeIdx = idx('type')
  const priceIdx = idx('price')
  const descIdx = idx('description')
  const skuIdx = idx('sku')
  const barcodeIdx = idx('barcode')
  const stockIdx = idx('stock')
  const catIdx = idx('categoryname')
  const statusIdx = idx('status')

  const missingCols: string[] = []
  if (nameIdx === -1) missingCols.push('name')
  if (typeIdx === -1) missingCols.push('type')
  if (priceIdx === -1) missingCols.push('price')
  if (statusIdx === -1) missingCols.push('status')
  if (missingCols.length > 0) {
    return {
      valid: [],
      errors: [
        {
          row: 1,
          field: 'headers',
          message: `Missing required column(s): ${missingCols.join(', ')}`
        }
      ]
    }
  }

  const valid: ProductImportRow[] = []
  const errors: ImportError[] = []
  const seenNames = new Set<string>()

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    let hasError = false

    const name = sanitize(row[nameIdx] ?? '')
    const typeRaw = sanitize(row[typeIdx] ?? '').toLowerCase()
    const priceRaw = sanitize(row[priceIdx] ?? '')
    const description = descIdx !== -1 ? sanitize(row[descIdx] ?? '') : ''
    const sku = skuIdx !== -1 ? sanitize(row[skuIdx] ?? '') : ''
    const barcode = barcodeIdx !== -1 ? sanitize(row[barcodeIdx] ?? '') : ''
    const stockRaw = stockIdx !== -1 ? sanitize(row[stockIdx] ?? '') : ''
    const categoryName = catIdx !== -1 ? sanitize(row[catIdx] ?? '') : ''
    const statusRaw = sanitize(row[statusIdx] ?? '').toLowerCase()

    // ── name ──
    if (!name) {
      errors.push({ row: rowNum, field: 'name', message: 'Name is required.' })
      hasError = true
    } else if (name.length < 2) {
      errors.push({ row: rowNum, field: 'name', message: 'Name must be at least 2 characters.' })
      hasError = true
    } else if (name.length > 150) {
      errors.push({ row: rowNum, field: 'name', message: 'Name must be 150 characters or less.' })
      hasError = true
    } else if (isForbidden(name)) {
      errors.push({
        row: rowNum,
        field: 'name',
        message: 'Name contains forbidden or unsafe content.'
      })
      hasError = true
    }

    // ── type ──
    if (typeRaw !== 'product' && typeRaw !== 'service') {
      errors.push({
        row: rowNum,
        field: 'type',
        message: 'Type must be exactly "product" or "service".'
      })
      hasError = true
    }

    // ── price ──
    const price = parseFloat(priceRaw)
    if (priceRaw === '' || isNaN(price) || price < 0) {
      errors.push({
        row: rowNum,
        field: 'price',
        message: 'Price must be a non-negative number.'
      })
      hasError = true
    }

    // ── description ──
    if (description.length > 1000) {
      errors.push({
        row: rowNum,
        field: 'description',
        message: 'Description must be 1000 characters or less.'
      })
      hasError = true
    } else if (isForbidden(description)) {
      errors.push({
        row: rowNum,
        field: 'description',
        message: 'Description contains forbidden or unsafe content.'
      })
      hasError = true
    }

    // ── stock ──
    let stock: number | null = null
    if (stockRaw !== '') {
      const stockNum = parseInt(stockRaw, 10)
      if (isNaN(stockNum) || stockNum < 0 || String(stockNum) !== stockRaw) {
        errors.push({
          row: rowNum,
          field: 'stock',
          message: 'Stock must be a non-negative whole number, or leave blank.'
        })
        hasError = true
      } else {
        stock = stockNum
      }
    }

    // ── status ──
    if (statusRaw !== 'active' && statusRaw !== 'inactive' && statusRaw !== 'draft') {
      errors.push({
        row: rowNum,
        field: 'status',
        message: 'Status must be "active", "inactive", or "draft".'
      })
      hasError = true
    }

    // ── sku / barcode forbidden check ──
    if (sku && isForbidden(sku)) {
      errors.push({ row: rowNum, field: 'sku', message: 'SKU contains forbidden content.' })
      hasError = true
    }
    if (barcode && isForbidden(barcode)) {
      errors.push({
        row: rowNum,
        field: 'barcode',
        message: 'Barcode contains forbidden content.'
      })
      hasError = true
    }

    if (!hasError) {
      const key = name.toLowerCase()
      const isDuplicate = seenNames.has(key) || (existingNames?.has(key) ?? false)
      if (!isDuplicate) seenNames.add(key)
      valid.push({
        row: rowNum,
        name,
        type: typeRaw as 'product' | 'service',
        price,
        description,
        sku,
        barcode,
        stock,
        categoryName,
        status: statusRaw as 'active' | 'inactive' | 'draft',
        isDuplicate
      })
    }
  }

  return { valid, errors }
}

// ─── Download helper ──────────────────────────────────────────────────────────

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
