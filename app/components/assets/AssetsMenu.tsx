import React from 'react';
import { useLocation, useNavigate } from '@remix-run/react';
import { Tabs, Tab, Icon } from '@blueprintjs/core';

export default function AssetsMenu() {
  const location = useLocation();
  const navigate = useNavigate();

  let currentTab = 'objects';
  if (location.pathname.includes('/assets/tokens')) currentTab = 'tokens';
  else if (location.pathname.includes('/assets/objects')) currentTab = 'objects';

  const handleTabChange = (newTabId: string) => {
    navigate(`/assets/${newTabId}`);
  };

  return (
    <Tabs
      id="assets-tabs"
      selectedTabId={currentTab}
      onChange={handleTabChange}
      animate={true}
      large={true}
      className=""
    >
      <Tab
        id="objects"
        title={
          <span className="flex items-center">
            <Icon icon="cube" className="mr-2" />
            Objects
          </span>
        }
      />
      <Tab
        id="tokens"
        title={
          <span className="flex items-center">
            <Icon icon="dollar" className="mr-2" />
            Tokens
          </span>
        }
      />
    </Tabs>
  );
} 