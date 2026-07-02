import React from 'react';
import { FixedSizeList as List } from 'react-window';

const Row = ({ index, style, data }) => {
  const row = data[index];
  return (
    <div style={{ ...style, display: 'flex', padding: '10px', borderBottom: '1px solid #ccc' }}>
      <div style={{ flex: 1 }}>{row.id}</div>
      <div style={{ flex: 2 }}>{row.name}</div>
      <div style={{ flex: 3 }}>{row.email}</div>
    </div>
  );
};

const VirtualizedTable = ({ data }) => (
  <List
    height={400}
    itemCount={data.length}
    itemSize={50}
    width="100%"
    itemData={data}
  >
    {Row}
  </List>
);

const TableVirtual = () => {
  const data = Array.from({ length: 10000 }, (_, index) => ({
    id: index + 1,
    name: `User ${index + 1}`,
    email: `user${index + 1}@example.com`,
  }));

  return <VirtualizedTable data={data} />;
};

export default TableVirtual;
