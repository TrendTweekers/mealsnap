'use client'

import React, { useState } from 'react'
import { ExternalLink, Mail, TrendingUp, CreditCard, FileText, Zap, DollarSign } from 'lucide-react'

export function PartnerPerksMarketplace() {
  const [votedDeals, setVotedDeals] = useState<string[]>([])

  const activeDeals = [
    {
      id: 'gusto',
      name: 'Gusto Payroll',
      description: '1 month free trial',
      benefit: 'Test payroll free',
      savings: 'Save on payroll processing',
      icon: '💰',
      color: 'from-orange-500 to-red-500',
      link: 'https://gusto.com/r/matspetere00b4470',
      ctaText: 'Start Free Trial'
    },
    {
      id: 'wise',
      name: 'Wise (TransferWise)',
      description: 'First transfer free',
      benefit: 'Save up to $30',
      savings: 'No hidden fees on international transfers',
      icon: '💸',
      color: 'from-green-500 to-teal-500',
      link: 'https://wise.com/invite/dic/peterh561',
      ctaText: 'Claim Free Transfer'
    }
  ]

  const upcomingDeals = [
    { name: 'QuickBooks', icon: '📊', votes: 23 },
    { name: 'Stripe', icon: '💳', votes: 18 },
    { name: 'Notion', icon: '📝', votes: 15 },
    { name: 'FreshBooks', icon: '📄', votes: 12 }
  ]

  const handleVote = (dealName: string) => {
    if (!votedDeals.includes(dealName)) {
      setVotedDeals([...votedDeals, dealName])
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 dark:from-teal-600 dark:to-cyan-700 flex items-center justify-center text-2xl">
            💎
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Exclusive Partner Perks</h1>
            <p className="text-muted-foreground mt-1">Special deals for freelancers & small business owners</p>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/20 dark:border-teal-500/30 rounded-lg flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div className="text-sm">
            <p className="text-muted-foreground">
              <strong className="text-teal-600 dark:text-teal-400">We earn a small commission</strong> when you sign up through these links—
              at no extra cost to you. Helps us keep SnapLedger free! 🙏
            </p>
          </div>
        </div>
      </div>

      {/* Active Deals */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-foreground">
          <Zap className="text-teal-500 dark:text-teal-400" size={24} />
          Active Deals
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {activeDeals.map((deal) => (
            <div
              key={deal.id}
              className="group relative bg-card border rounded-2xl p-6 border-border hover:border-teal-500/50 transition-all duration-300 hover:scale-[1.02]"
            >
              {/* Gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${deal.color} opacity-0 dark:opacity-5 group-hover:opacity-5 dark:group-hover:opacity-10 rounded-2xl transition-opacity`} />
              
              {/* Content */}
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-3xl border border-border">
                      {deal.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{deal.name}</h3>
                      <p className="text-teal-600 dark:text-teal-400 font-semibold text-sm">{deal.description}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <TrendingUp size={16} className="mt-1 text-teal-500 dark:text-teal-400 flex-shrink-0" />
                    <span className="text-sm">{deal.benefit}</span>
                  </div>
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <DollarSign size={16} className="mt-1 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-sm">{deal.savings}</span>
                  </div>
                </div>

                <a
                  href={deal.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition-all group-hover:scale-105"
                >
                  {deal.ctaText}
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Section */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-muted-foreground">
          <span>🔜</span>
          Deals We're Working On
        </h2>
        
        <div className="bg-muted/50 rounded-xl p-6 border border-border">
          <p className="text-muted-foreground text-sm mb-4">
            Vote for the partnerships you'd like to see next! We're actively negotiating with these companies.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {upcomingDeals.map((deal) => {
              const hasVoted = votedDeals.includes(deal.name)
              const displayVotes = deal.votes + (hasVoted ? 1 : 0)
              
              return (
                <button
                  key={deal.name}
                  onClick={() => handleVote(deal.name)}
                  disabled={hasVoted}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    ${hasVoted 
                      ? 'border-teal-500 bg-teal-500/10 dark:bg-teal-500/20' 
                      : 'border-dashed border-border hover:border-teal-500/50 hover:bg-muted/50'
                    }
                    ${hasVoted ? 'cursor-default' : 'cursor-pointer'}
                  `}
                >
                  <div className="text-3xl mb-2">{deal.icon}</div>
                  <div className="text-sm font-semibold mb-2 text-foreground">{deal.name}</div>
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <span className={hasVoted ? 'text-teal-600 dark:text-teal-400' : ''}>
                      👍 {displayVotes}
                    </span>
                    {hasVoted && <span className="text-teal-600 dark:text-teal-400 ml-1">✓</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-muted/50 rounded-xl p-6 border border-border">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Mail className="text-teal-500 dark:text-teal-400 mt-1" size={24} />
            <div>
              <h3 className="font-semibold mb-1 text-foreground">Have a Partnership Suggestion?</h3>
              <p className="text-sm text-muted-foreground">
                Know a service that would benefit SnapLedger users? Let us know!
              </p>
            </div>
          </div>
          <a
            href="mailto:partnerships@snapledger.com?subject=Partnership Suggestion"
            className="px-6 py-3 bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700 text-white rounded-lg font-semibold transition-colors whitespace-nowrap"
          >
            Email Us
          </a>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="text-center text-muted-foreground text-sm">
        <p>
          All partnerships are carefully vetted to ensure they provide real value to our users.
        </p>
      </div>
    </div>
  )
}
