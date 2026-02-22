import { useState, useCallback, memo, useEffect } from 'react';
import { Table, NumberInput, Button, ActionIcon, Title, Group, Tooltip, Select, Checkbox } from '@mantine/core';
import { IconTrash, IconAlertCircle } from '@tabler/icons-react';
import { FixturePatch, FixtureLibrary } from '../../shared/interfaces';
import { useStore } from '../../context/StoreContext';

const DMX_UNIVERSE_MAX = 63;
const DMX_ADDRESS_MAX = 512;

function newFixture(): FixturePatch {
  return {
    channel: 1,
    DMXUniverse: 1,
    DMXAddress: 1,
    fixtureTypeId: '',
    modeId: '',
    standalone: false,
  };
}

const FixtureRow = memo(({
  id,
  fixture,
  fixtureLibrary,
  onUpdate,
  onDelete,
}: {
  id: string;
  fixture: FixturePatch;
  fixtureLibrary: FixtureLibrary;
  onUpdate: (id: string, patch: Partial<FixturePatch>) => void;
  onDelete: (id: string) => void;
}) => {
  const universeValid = fixture.DMXUniverse >= 1 && fixture.DMXUniverse <= DMX_UNIVERSE_MAX;
  const addressValid = fixture.DMXAddress >= 1 && fixture.DMXAddress <= DMX_ADDRESS_MAX;

  const fixtureTypeData = Object.entries(fixtureLibrary).map(([value, profile]) => ({
    value,
    label: `${profile.manufacturer} ${profile.model}`,
  }));

  const selectedProfile = fixture.fixtureTypeId ? fixtureLibrary[fixture.fixtureTypeId] : undefined;
  const fixtureTypeUnknown = fixture.fixtureTypeId && !selectedProfile;

  const modeData = selectedProfile
    ? Object.keys(selectedProfile.modes).map((m) => ({ value: m, label: m }))
    : [];

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

      <Table.Td p={0}>
        <Select
          variant="unstyled"
          value={fixture.fixtureTypeId || null}
          onChange={(val) => onUpdate(id, { fixtureTypeId: val ?? '', modeId: '' })}
          data={fixtureTypeData}
          placeholder="Select fixture..."
          styles={{ input: { padding: '8px' } }}
          rightSection={fixtureTypeUnknown && (
            <Tooltip label={`Unknown fixture type: ${fixture.fixtureTypeId}`} position="top" withArrow>
              <IconAlertCircle size={16} color="var(--mantine-color-red-filled)" style={{ cursor: 'help' }} />
            </Tooltip>
          )}
        />
      </Table.Td>

      <Table.Td p={0}>
        <Select
          variant="unstyled"
          value={fixture.modeId || null}
          onChange={(val) => onUpdate(id, { modeId: val ?? '' })}
          data={modeData}
          placeholder="Mode..."
          disabled={!selectedProfile}
          styles={{ input: { padding: '8px' } }}
        />
      </Table.Td>

      <Table.Td align="center">
        <Checkbox
          checked={fixture.standalone}
          onChange={(e) => onUpdate(id, { standalone: e.currentTarget.checked })}
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

export default function Patch() {
  const [patch, setPatch] = useStore('patch');
  const [fixtureLibrary, setFixtureLibrary] = useState<FixtureLibrary>({});
  const rows = patch ?? {};

  useEffect(() => {
    window.api.fixtures.getLibrary().then(setFixtureLibrary);
  }, []);

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
            <Table.Th w={220}>Fixture Type</Table.Th>
            <Table.Th w={100}>Mode</Table.Th>
            <Table.Th w={100}>Standalone</Table.Th>
            <Table.Th w={50} />
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {Object.keys(rows).length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={7} align="center" c="dimmed" py="xl">
                No fixtures patched. Click "Add Fixture" to start.
              </Table.Td>
            </Table.Tr>
          ) : (
            Object.entries(rows).map(([id, fixture]) => (
              <FixtureRow
                key={id}
                id={id}
                fixture={fixture}
                fixtureLibrary={fixtureLibrary}
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