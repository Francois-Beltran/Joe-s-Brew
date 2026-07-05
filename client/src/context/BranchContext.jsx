import { createContext, useContext, useState } from 'react'

export const BRANCHES = {
  cogtong:  { id: 'cogtong',  label: 'Cogtong',  emoji: '🏡', delivery: true,  comingSoon: false },
  candijay: { id: 'candijay', label: 'Candijay', emoji: '☕', delivery: false, comingSoon: false },
  loboc:    { id: 'loboc',    label: 'Loboc',    emoji: '🌿', delivery: false, comingSoon: true  },
}

const BranchContext = createContext(null)

export function BranchProvider({ children }) {
  const [branchId, setBranchId] = useState('cogtong')
  const branch = BRANCHES[branchId] ?? BRANCHES.cogtong
  return (
    <BranchContext.Provider value={{ branch, branchId, setBranchId, BRANCHES }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranch must be used inside <BranchProvider>')
  return ctx
}
