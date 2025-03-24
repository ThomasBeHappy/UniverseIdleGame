import React from 'react';
import styled from '@emotion/styled';
import { Faction } from '../types/galaxy';

const TopBarContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  padding: 0 20px;
  color: white;
  z-index: 1000;
`;

const Section = styled.div`
  display: flex;
  align-items: center;
  margin-right: 40px;
`;

const Label = styled.span`
  color: rgba(255, 255, 255, 0.6);
  margin-right: 8px;
  font-size: 14px;
`;

const Value = styled.span`
  color: white;
  font-size: 16px;
  font-weight: 500;
`;

const FactionName = styled(Value)`
  color: ${props => props.color};
  text-shadow: 0 0 10px ${props => props.color}40;
`;

const Date = styled(Value)`
  font-family: monospace;
`;

interface TopBarProps {
  currentDate: number; // Year number
  playerFaction: Faction;
  ownedSystemCount: number;
}

export function TopBar({ currentDate, playerFaction, ownedSystemCount }: TopBarProps) {
  return (
    <TopBarContainer>
      <Section>
        <Label>Year:</Label>
        <Date>{currentDate}</Date>
      </Section>

      <Section>
        <Label>Faction:</Label>
        <FactionName color={playerFaction.color}>{playerFaction.name}</FactionName>
      </Section>

      <Section>
        <Label>Type:</Label>
        <Value>{playerFaction.type.replace(/_/g, ' ')}</Value>
      </Section>

      <Section>
        <Label>Systems:</Label>
        <Value>{ownedSystemCount}</Value>
      </Section>
    </TopBarContainer>
  );
} 