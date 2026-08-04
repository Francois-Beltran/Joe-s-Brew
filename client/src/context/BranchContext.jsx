import { createContext, useContext, useState } from 'react'

export const BRANCHES = {
  cogtong: {
    id: 'cogtong', label: 'Cogtong', emoji: '🏡', delivery: true, comingSoon: false,
    images: ['/images/web-background.jpg'],
  },
  candijay: {
    id: 'candijay', label: 'Candijay', emoji: '☕', delivery: false, comingSoon: false,
    images: [
      '/images/joes-brew-candijay-branch.jpg',
      '/images/joes-brew-candijay-branch1.jpg',
      '/images/joes-brew-candijay-branch2.jpg',
      '/images/joes-brew-candijay-branch3.jpg',
    ],
  },
  loboc: {
    id: 'loboc', label: 'Loboc', emoji: '🌿', delivery: false, comingSoon: true,
    images: ['/images/web-background-1.jpg'],
  },
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
