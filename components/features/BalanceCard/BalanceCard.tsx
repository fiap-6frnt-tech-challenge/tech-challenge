'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff } from 'lucide-react';
import { formatCurrencyExact, formatTodayDate } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { BalanceCardProps } from './IBalanceCard';

export function BalanceCard({ balance, owner, label = 'Conta Corrente' }: BalanceCardProps) {
  const isPositive = balance >= 0;
  const [visible, setVisible] = useState(false);

  return (
    <Card padding="lg" className="relative overflow-hidden mb-sm bg-brand-dark! text-text-on-bg">
      <Image
        src="/pixels.png"
        aria-hidden="true"
        width={168}
        height={168}
        className="absolute bottom-0 left-0 w-42 h-auto pointer-events-none select-none"
        alt=""
      />
      <Image
        src="/pixels.png"
        aria-hidden="true"
        width={168}
        height={168}
        className="absolute top-0 right-0 w-42 h-auto pointer-events-none select-none rotate-180"
        alt=""
      />

      <div
        className="
          relative flex gap-lg flex-1
          max-md:grid max-md:grid-cols-1 max-md:justify-items-center
        "
      >
        <div
          className="
            flex flex-col
            max-md:items-center max-md:text-center
          "
        >
          {owner && <p className="text-xl font-semibold mb-sm">Olá, {owner}! :)</p>}

          <p className="text-sm mb-0 md:mb-lg">{formatTodayDate()}</p>

          <Image
            src="/piggy-bank.png"
            aria-hidden="true"
            width={283}
            height={229}
            className="pointer-events-none select-none max-md:hidden"
            alt=""
          />
        </div>

        <div
          className="
            flex flex-col items-start p-2xl mt-0 md:mt-sm gap-sm min-w-50 self-start mx-auto
            max-md:items-center max-md:text-center max-md:pt-0
          "
        >
          <div className="w-fit min-w-40">
            <div className="flex items-center gap-sm max-md:justify-center">
              <span className="text-base">Saldo</span>

              <Button
                variant="ghost"
                size="sm"
                leftIcon={
                  visible ? (
                    <Eye size={20} className="text-icon-accent" />
                  ) : (
                    <EyeOff size={20} className="text-icon-accent" />
                  )
                }
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? 'Ocultar saldo' : 'Exibir saldo'}
                className="hover:bg-transparent p-xs"
              />
            </div>

            <span className="block h-px w-full bg-icon-accent my-xs" />

            <p className="text-base">{label}</p>
          </div>

          <span className={`text-xl font-bold ${!isPositive ? 'text-feedback-danger' : ''}`}>
            {visible ? formatCurrencyExact(balance) : 'R$ ••••••'}
          </span>
        </div>

        <Image
          src="/piggy-bank.png"
          aria-hidden="true"
          width={283}
          height={229}
          className="pointer-events-none select-none hidden max-md:block"
          alt=""
        />
      </div>
    </Card>
  );
}
