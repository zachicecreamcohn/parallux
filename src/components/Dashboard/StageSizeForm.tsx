import { useState, useEffect } from 'react';
import { Group, NumberInput, Button, Title } from '@mantine/core';
import { StageSize } from '../../shared/interfaces';
import { useStore } from '../../context/StoreContext';

export default function StageSizeForm() {
  const [stageSize, setStageSize] = useStore('stageSize');
  const [, setGridOverlay] = useStore('gridOverlay');

  const [local, setLocal] = useState<StageSize>({
    widthFeet: 0, widthInches: 0, heightFeet: 0, heightInches: 0, gridSpacingFt: 1,
  });

  useEffect(() => {
    if (stageSize && Object.keys(stageSize).length > 0) {
      setLocal(stageSize as StageSize);
    }
  }, []);

  const save = () => setStageSize(local);

  const resetGrid = () => setGridOverlay({} as any);

  return (
    <div>
      <Title order={5} mb="xs">Stage Size</Title>
      <Group align="flex-end" gap="sm">
        <NumberInput
          label="Width (ft)"
          value={local.widthFeet}
          onChange={(v) => setLocal((s) => ({ ...s, widthFeet: Number(v) }))}
          onBlur={save}
          min={0} hideControls style={{ width: 100 }}
        />
        <NumberInput
          label="Width (in)"
          value={local.widthInches}
          onChange={(v) => setLocal((s) => ({ ...s, widthInches: Number(v) }))}
          onBlur={save}
          min={0} max={11} hideControls style={{ width: 100 }}
        />
        <NumberInput
          label="Height (ft)"
          value={local.heightFeet}
          onChange={(v) => setLocal((s) => ({ ...s, heightFeet: Number(v) }))}
          onBlur={save}
          min={0} hideControls style={{ width: 100 }}
        />
        <NumberInput
          label="Height (in)"
          value={local.heightInches}
          onChange={(v) => setLocal((s) => ({ ...s, heightInches: Number(v) }))}
          onBlur={save}
          min={0} max={11} hideControls style={{ width: 100 }}
        />
        <NumberInput
          label="Grid spacing (ft)"
          value={local.gridSpacingFt ?? 1}
          onChange={(v) => setLocal((s) => ({ ...s, gridSpacingFt: Number(v) }))}
          onBlur={save}
          min={1} hideControls style={{ width: 120 }}
        />
        <Button variant="subtle" onClick={resetGrid}>Reset Grid</Button>
      </Group>
    </div>
  );
}