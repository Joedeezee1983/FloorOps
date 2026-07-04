'use client'

import type { MapMachine } from '@/types'

interface BankEntry {
  bankNumber: string
  count: number
}

interface BankSection {
  section: string
  banks: BankEntry[]
}

export interface BankPlacementSidebarProps {
  machines: MapMachine[]
  selectedBank: string | null
  isPlacing: boolean
  onSelectBank: (bankNumber: string) => void
}

export default function BankPlacementSidebar({
  machines,
  selectedBank,
  isPlacing,
  onSelectBank,
}: BankPlacementSidebarProps) {
  const { unplacedSections, placedBanks } = computeBankGroups(machines)
  const totalUnplaced = unplacedSections.reduce((n, s) => n + s.banks.length, 0)

  return (
    <div className="w-60 border-r border-gray-800 bg-gray-950 flex flex-col overflow-hidden shrink-0">
      <div className="px-4 py-3 border-b border-gray-800">
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
          Bank Placement
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {selectedBank ? (
            <>
              Bank <span className="text-white font-mono">{selectedBank}</span> — click map to place
            </>
          ) : (
            'Select a bank below'
          )}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {totalUnplaced === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-green-400 font-medium">All banks placed</p>
            <p className="text-xs text-gray-600 mt-1">{placedBanks.length} banks on the map</p>
          </div>
        ) : (
          <div className="py-1">
            <p className="px-4 py-1.5 text-[10px] font-medium text-gray-600 uppercase tracking-wider">
              Unplaced · {totalUnplaced}
            </p>
            {unplacedSections.map((section) => (
              <div key={section.section}>
                <p className="px-4 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-900/50">
                  Section {section.section}
                </p>
                {section.banks.map((bank) => (
                  <BankRow
                    key={bank.bankNumber}
                    bank={bank}
                    isSelected={selectedBank === bank.bankNumber}
                    isPlacing={isPlacing && selectedBank === bank.bankNumber}
                    onClick={() => onSelectBank(bank.bankNumber)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {placedBanks.length > 0 && (
          <div className="border-t border-gray-800 py-1">
            <p className="px-4 py-1.5 text-[10px] font-medium text-gray-600 uppercase tracking-wider">
              Placed · {placedBanks.length}
            </p>
            {placedBanks.map((bank) => (
              <div key={bank.bankNumber} className="flex items-center gap-2 px-4 py-2">
                <span className="text-green-500 text-xs shrink-0">✓</span>
                <span className="text-xs font-mono text-gray-500">{bank.bankNumber}</span>
                <span className="text-[10px] text-gray-600 ml-auto shrink-0">{bank.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface BankRowProps {
  bank: BankEntry
  isSelected: boolean
  isPlacing: boolean
  onClick: () => void
}

function BankRow({ bank, isSelected, isPlacing, onClick }: BankRowProps) {
  return (
    <button
      onClick={onClick}
      disabled={isPlacing}
      className={`w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors border-l-2 ${
        isSelected
          ? 'bg-amber-900/30 border-amber-500'
          : 'hover:bg-gray-800/50 border-transparent'
      }`}
    >
      <span
        className={`flex-1 text-xs font-mono truncate ${
          isSelected ? 'text-amber-200' : 'text-gray-300'
        }`}
      >
        {bank.bankNumber}
      </span>
      {isPlacing ? (
        <span className="text-[10px] text-amber-400 shrink-0 animate-pulse">placing…</span>
      ) : (
        <span className="text-[10px] text-gray-600 shrink-0">{bank.count}</span>
      )}
    </button>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractSection(bankNumber: string): string {
  const dashIdx = bankNumber.indexOf('-')
  return dashIdx !== -1 ? bankNumber.slice(0, dashIdx) : 'Other'
}

function computeBankGroups(machines: MapMachine[]): {
  unplacedSections: BankSection[]
  placedBanks: BankEntry[]
} {
  const bankTotals = new Map<string, number>()
  const bankPlacedCount = new Map<string, number>()

  for (const m of machines) {
    bankTotals.set(m.bankNumber, (bankTotals.get(m.bankNumber) ?? 0) + 1)
    if (m.gridX !== null && m.gridY !== null) {
      bankPlacedCount.set(m.bankNumber, (bankPlacedCount.get(m.bankNumber) ?? 0) + 1)
    }
  }

  const unplacedBySection = new Map<string, BankEntry[]>()
  const placedBanks: BankEntry[] = []

  bankTotals.forEach((total, bankNumber) => {
    const placed = bankPlacedCount.get(bankNumber) ?? 0
    const entry: BankEntry = { bankNumber, count: total }

    if (placed === total) {
      placedBanks.push(entry)
    } else {
      const section = extractSection(bankNumber)
      const existing = unplacedBySection.get(section) ?? []
      existing.push(entry)
      unplacedBySection.set(section, existing)
    }
  })

  const unplacedSections: BankSection[] = Array.from(unplacedBySection.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([section, banks]) => ({
      section,
      banks: [...banks].sort((a, b) => a.bankNumber.localeCompare(b.bankNumber)),
    }))

  placedBanks.sort((a, b) => a.bankNumber.localeCompare(b.bankNumber))

  return { unplacedSections, placedBanks }
}
