/**
 * DatabaseProvider — Placeholder for WatermelonDB (Phase 3+)
 *
 * WatermelonDB is NOT active in V2. The schema is defined but the database
 * is not initialized until backend sync is ready (Phase 3+).
 *
 * This provider is a simple passthrough to avoid breaking the provider tree.
 */

import React from 'react';

interface DatabaseProviderProps {
  children: React.ReactNode;
}

/**
 * Passthrough provider — WatermelonDB disabled until Phase 3.
 * When ready, this will wrap children with WatermelonDatabaseProvider.
 */
export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({
  children,
}) => {
  return <>{children}</>;
};

export default DatabaseProvider;
