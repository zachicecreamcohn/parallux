import { useState, useCallback, memo } from 'react';
import { Table, NumberInput, TextInput, Button, ActionIcon, Title, Group, Tooltip, Select } from '@mantine/core';
import { IconTrash, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { FixturePatch, SizeMode } from '../../shared/interfaces';
import { useStore } from '../../context/StoreContext';

// --- 1. Configuration ---

const PARAM_COLUMNS = [
  { key: 'panChannels', label: 'Pan', width: 90 },
  { key: 'tiltChannels', label: 'Tilt', width: 90 },
  { key: 'zoomChannels', label: 'Zoom', width: 90 },
  { key: 'irisChannels', label: 'Iris', width: 90 },
  { key: 'intensityChannels', label: 'Intensity', width: 90 },
] as const;

type ChannelKey = typeof PARAM_COLUMNS[number]['key'];

const DMX_UNIVERSE_MAX = 63;
const DMX_ADDRESS_MAX = 512;
const TOOLTIP_TEXT = "DMX offset channels within the fixture profile (e.g. '1,2' for 16-bit)";

// --- 2. Helpers ---

function parseChannels(val: string): number[] {
  return val
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);
}

function channelsToString(channels: number[]): string {
  return channels.join(', ');
}

function newFixture(): FixturePatch {
  return {
    channel: 1,
    DMXUniverse: 1,
    DMXAddress: 1,
    panChannels: [],
    tiltChannels: [],
    zoomChannels: [],
    irisChannels: [],
    intensityChannels: [],
    sizeMode: 'zoom',
  };
}

// --- 3. Atom Components ---

const ChannelInput = memo(({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) => {
  const [localValue, setLocalValue] = useState(channelsToString(value));

  const handleChange = (str: string) => {
    if (/^[0-9,\s]*$/.test(str)) {
      setLocalValue(str);
    }
  };

  const handleBlur = () => {
    const parsed = parseChannels(localValue);
    onChange(parsed);
    setLocalValue(channelsToString(parsed));
  };

  return (
    <TextInput
      variant="unstyled"
      value={localValue}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      placeholder="-"
      styles={{ input: { padding: '8px', fontSize: '14px' } }}
    />
  );
});

const FixtureRow = memo(({
  id,
  fixture,
  onUpdate,
  onDelete,
}: {
  id: string;
  fixture: FixturePatch;
  onUpdate: (id: string, patch: Partial<FixturePatch>) => void;
  onDelete: (id: string) => void;
}) => {
  const universeValid = fixture.DMXUniverse >= 1 && fixture.DMXUniverse <= DMX_UNIVERSE_MAX;
  const addressValid = fixture.DMXAddress >= 1 && fixture.DMXAddress <= DMX_ADDRESS_MAX;

  return (
    <Table.Tr>
      <Table.Td p={0}>
        <NumberInput
          variant="unstyled"
          value={fixture.channel}
          onChange={(val) => onUpdate(id, { channel: Number(val) })}
          placeholder="#"
          hideControls
          allowNegative={false}
          styles={{ input: { padding: '8px', textAlign: 'center' } }}
        />
      </Table.Td>

      <Table.Td p={0}>
        <NumberInput
          variant="unstyled"
          value={fixture.DMXUniverse}
          onChange={(val) => onUpdate(id, { DMXUniverse: Number(val) })}
          min={1}
          max={DMX_UNIVERSE_MAX}
          hideControls
          allowNegative={false}
          error={!universeValid}
          styles={{ input: { padding: '8px', color: !universeValid ? 'var(--mantine-color-red-filled)' : undefined } }}
          rightSection={!universeValid && (
            <Tooltip label={`Universe must be 1–${DMX_UNIVERSE_MAX}`} position="top" withArrow>
              <IconAlertCircle size={16} color="var(--mantine-color-red-filled)" style={{ cursor: 'help' }} />
            </Tooltip>
          )}
        />
      </Table.Td>

      <Table.Td p={0}>
        <NumberInput
          variant="unstyled"
          value={fixture.DMXAddress}
          onChange={(val) => onUpdate(id, { DMXAddress: Number(val) })}
          min={1}
          max={DMX_ADDRESS_MAX}
          hideControls
          allowNegative={false}
          error={!addressValid}
          styles={{ input: { padding: '8px', color: !addressValid ? 'var(--mantine-color-red-filled)' : undefined } }}
          rightSection={!addressValid && (
            <Tooltip label={`Address must be 1–${DMX_ADDRESS_MAX}`} position="top" withArrow>
              <IconAlertCircle size={16} color="var(--mantine-color-red-filled)" style={{ cursor: 'help' }} />
            </Tooltip>
          )}
        />
      </Table.Td>

      {PARAM_COLUMNS.map((col) => (
        <Table.Td p={0} key={col.key}>
          <ChannelInput
            value={fixture[col.key as ChannelKey]}
            onChange={(val) => onUpdate(id, { [col.key]: val })}
          />
        </Table.Td>
      ))}

      <Table.Td p={0}>
        <Select
          variant="unstyled"
          value={fixture.sizeMode}
          onChange={(val) => onUpdate(id, { sizeMode: val as SizeMode })}
          data={[
            { value: 'zoom', label: 'Zoom' },
            { value: 'iris', label: 'Iris' },
          ]}
          styles={{ input: { padding: '8px' } }}
        />
      </Table.Td>

      <Table.Td align="center">
        <ActionIcon color="red" variant="subtle" onClick={() => onDelete(id)}>
          <IconTrash style={{ width: '70%', height: '70%' }} stroke={1.5} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  );
});

// --- 4. Main Component ---

export default function Patch() {
  const [patch, setPatch] = useStore('patch');
  const rows = patch ?? {};

  const addFixture = useCallback(() => {
    const id = `fixture-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPatch({ ...rows, [id]: newFixture() });
  }, [rows, setPatch]);

  const updateFixture = useCallback((id: string, changes: Partial<FixturePatch>) => {
    setPatch({ ...rows, [id]: { ...rows[id], ...changes } });
  }, [rows, setPatch]);

  const deleteFixture = useCallback((id: string) => {
    const next = { ...rows };
    delete next[id];
    setPatch(next);
  }, [rows, setPatch]);

  return (
    <div style={{ padding: '20px' }}>
      <Group justify="space-between" mb="lg">
        <Title order={3}>Patch</Title>
        <Button onClick={addFixture}>Add Fixture</Button>
      </Group>

      <Table withTableBorder withColumnBorders verticalSpacing="sm" layout="fixed">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={80}>Ch #</Table.Th>
            <Table.Th w={90}>Universe</Table.Th>
            <Table.Th w={90}>Address</Table.Th>

            {PARAM_COLUMNS.map((col) => (
              <Table.Th w={col.width} key={col.key}>
                <Group gap={4} wrap="nowrap">
                  {col.label}
                  <Tooltip
                    label={TOOLTIP_TEXT}
                    multiline
                    w={220}
                    withArrow
                    events={{ hover: true, focus: true, touch: true }}
                  >
                    <IconInfoCircle size={14} style={{ cursor: 'help', opacity: 0.5 }} />
                  </Tooltip>
                </Group>
              </Table.Th>
            ))}

            <Table.Th w={100}>Size Mode</Table.Th>
            <Table.Th w={50} />
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {Object.keys(rows).length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={PARAM_COLUMNS.length + 5} align="center" c="dimmed" py="xl">
                No fixtures patched. Click "Add Fixture" to start.
              </Table.Td>
            </Table.Tr>
          ) : (
            Object.entries(rows).map(([id, fixture]) => (
              <FixtureRow
                key={id}
                id={id}
                fixture={fixture}
                onUpdate={updateFixture}
                onDelete={deleteFixture}
              />
            ))
          )}
        </Table.Tbody>
      </Table>
    </div>
  );
}
