import styled from 'styled-components';
import * as icons from './icons';

const Title = styled.h2`
  text-align: center;
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
  cursor: pointer;
  svg {
    width: 36px;
  }
  span {
    margin-top: 16px;
  }
  &:hover {
    svg {
      transform: scale(1.2);
      transition: transform 0.2s ease-in-out;
    }
  }
`;

function App() {
  return (
    <>
      <Title>Shared Icons</Title>
      <Cards>
        {Object.entries(icons).map(([name, Icon]) => (
          <Card key={name}>
            <Icon />
            <span>{name}</span>
          </Card>
        ))}
      </Cards>
    </>
  );
}

export default App;
