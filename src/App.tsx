import React, { useDeferredValue, useState } from 'react';
import styled from 'styled-components';
import * as icons from './icons';

const Title = styled.h2`
  text-align: center;
`;

const SearchInput = styled.input`
  display: block;
  margin: 0 auto;
  padding: 8px 16px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Cards = styled.main`
  margin: 32px 0px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 32px;
`;

const Card = styled.div`
  width: 200px;
  padding: 32px 24px;
  border: 1px solid;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  svg {
    transition: transform 0.2s ease-in-out;
    &:not(:first-child) {
      margin-left: 8px;
    }
  }
  span {
    margin-top: 16px;
    word-break: break-all;
    transition: font-weight 0.2s ease-in-out;
  }
  &:hover {
    svg {
      transform: scale(1.2);
    }
    span {
      font-weight: bold;
    }
  }
`;

function App() {
  const [search, setSearch] = useState('');

  const deferredIcons = useDeferredValue(
    Object.entries(icons).filter(([name]) =>
      name.toLowerCase().includes(search.toLowerCase()),
    ),
  );

  return (
    <>
      <Title>Shared Icons</Title>
      <SearchInput
        id='search'
        type='text'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder='Search...'
      />
      <Cards>
        {deferredIcons.map(([name, Icon]) => (
          <Card key={name}>
            <div>
              <Icon size='logo' variant='outline' />
              <Icon size='logo' variant='twoTone' />
              <Icon size='logo' variant='fill' />
            </div>
            <div>
              <Icon size='logo' variant='outline' isActive />
              <Icon size='logo' variant='twoTone' isActive />
              <Icon size='logo' variant='fill' isActive />
            </div>
            <span>{name}</span>
          </Card>
        ))}
      </Cards>
    </>
  );
}

export default App;
