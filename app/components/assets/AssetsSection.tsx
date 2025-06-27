import React, { useEffect, useState, useMemo, useRef } from 'react';
import AssetsMenu from './AssetsMenu';
import { AddressSelect } from '../governance/AddressSelect';
import { useAtom } from 'jotai';
import { lastSelectedAccountAtom } from 'app/atoms';
import { useAccounts, useApi, useKeyringLoaded } from 'app/components/Api';
import { Container } from '../common/Container';
import { FormattedAmount } from '../common/FormattedAmount';
import { Spinner } from '@blueprintjs/core';

interface AssetsSectionProps {
  children: React.ReactNode;
}

export default function AssetsSection({ children }: AssetsSectionProps) {
  const [selectedAccount, setSelectedAccount] = useAtom(lastSelectedAccountAtom);
  const accountObjects = useAccounts();
  const accounts = useMemo(() => accountObjects.map((account) => account.address), [accountObjects]);
  const api = useApi();
  const keyringLoaded = useKeyringLoaded();
  const [accountBalances, setAccountBalances] = useState<Record<string, bigint>>({});
  const [balancesLoading, setBalancesLoading] = useState(false);
  const fetchingRef = useRef(false);

  // Fetch balances for all accounts
  useEffect(() => {
    if (!api || !keyringLoaded || accounts.length === 0 || fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;
    setBalancesLoading(true);
    
    const fetchBalances = async () => {
      const balances: Record<string, bigint> = {};
      
      try {
        await Promise.all(
          accounts.map(async (address) => {
            try {
              const balanceData = await api.derive.balances.all(address);
              balances[address] = balanceData.availableBalance.toBigInt();
            } catch (error) {
              console.warn(`Failed to fetch balance for ${address}:`, error);
              balances[address] = BigInt(0);
            }
          })
        );
        setAccountBalances(balances);
      } catch (error) {
        console.error('Failed to fetch account balances:', error);
      } finally {
        setBalancesLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchBalances();
  }, [api, keyringLoaded, accounts]);

  // Create metadata for AddressSelect
  const accountMetadata: Record<string, React.ReactNode> = useMemo(() => {
    const metadata: Record<string, React.ReactNode> = {};
    accounts.forEach((address) => {
      if (balancesLoading) {
        metadata[address] = <Spinner size={12} />;
      } else if (accountBalances[address] !== undefined) {
        metadata[address] = (
          <span className="text-xs text-gray-400 font-mono">
            <FormattedAmount value={accountBalances[address]} />
          </span>
        );
      }
    });
    return metadata;
  }, [balancesLoading, accountBalances, accounts]);

  // Internal helper to render the account selector
  function AccountSelector({
    accounts,
    selectedAccount,
    setSelectedAccount,
    accountMetadata,
    balancesLoading
  }: {
    accounts: string[];
    selectedAccount: string | null;
    setSelectedAccount: (address: string | null) => void;
    accountMetadata: Record<string, React.ReactNode>;
    balancesLoading: boolean;
  }) {
    return (
      <div className="flex items-center gap-2">
        <div className="font-medium whitespace-nowrap hidden sm:block">Account:</div>
        <AddressSelect
          onAddressChange={setSelectedAccount}
          selectedAddress={selectedAccount}
          addresses={accounts}
          isLoading={accounts.length === 0}
          metadata={accountMetadata}
        />
      </div>
    );
  }

  return (
    <Container>
      <div className="grid gap-6">
        <div className="flex justify-between items-center">
          <AssetsMenu />
          <AccountSelector
            accounts={accounts}
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
            accountMetadata={accountMetadata}
            balancesLoading={balancesLoading}
          />
        </div>
        {children}
      </div>
    </Container>
  );
} 