import React, { ReactNode } from 'react';
import styled from '@emotion/styled';
import { Faction } from '../types/galaxy';

export interface TopBarProps {
    currentDate: number;
    playerFaction: Faction;
    ownedSystemCount: number;
    extraContent?: ReactNode;
}

const TopBarContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: rgba(0, 0, 0, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  padding: 0 20px;
  backdrop-filter: blur(10px);
  z-index: 100;
`;

const FactionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const FactionName = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: ${props => props.color};
`;

const SystemCount = styled.div`
  font-size: 14px;
  color: #ced4da;
`;

const Date = styled.div`
  margin-left: auto;
  font-size: 16px;
  color: #ced4da;
`;

export function TopBar({ currentDate, playerFaction, ownedSystemCount, extraContent }: TopBarProps) {
    return (
        <TopBarContainer>
            <FactionInfo>
                <FactionName color={playerFaction.color}>
                    {playerFaction.name}
                </FactionName>
                <SystemCount>
                    {ownedSystemCount} system{ownedSystemCount !== 1 ? 's' : ''} controlled
                </SystemCount>
            </FactionInfo>
            {extraContent}
            <Date>Year {currentDate}</Date>
        </TopBarContainer>
    );
} 