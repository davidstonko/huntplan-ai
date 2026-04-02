/**
 * DatabaseProvider — React context provider for WatermelonDB
 * Wraps the app to provide database access throughout the component tree.
 * Must be placed near the root of the app before contexts that use the database.
 */

import React, { useMemo } from 'react';
import { DatabaseProvider as WatermelonDatabaseProvider } from '@nozbe/watermelondb/react';
import database from './index';

interface DatabaseProviderProps {
  children: React.ReactNode;
}

/**
 * Provides WatermelonDB database instance to the entire app.
 * Memoizes the database to prevent unnecessary re-renders.
 */
export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({
  children,
}) => {
  const db = useMemo(() => database, []);

  return (
    <WatermelonDatabaseProvider database={db}>
      {children}
    </WatermelonDatabaseProvider>
  );
};

export default DatabaseProvider;
