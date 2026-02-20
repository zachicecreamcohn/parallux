import { Stack, Title } from '@mantine/core';
import { useStore } from '../context/StoreContext';
import CameraFeed from '../components/Dashboard/CameraFeed';
import StageSizeForm from '../components/Dashboard/StageSizeForm';
import { StageSize } from '../shared/interfaces';

const DEFAULT_STAGE: StageSize = { widthFeet: 0, widthInches: 0, heightFeet: 0, heightInches: 0, gridSpacingFt: 1 };

export default function Dashboard() {
  const [stageSize] = useStore('stageSize');
  const stage = (stageSize && Object.keys(stageSize).length > 0)
    ? stageSize as StageSize
    : DEFAULT_STAGE;

  return (
    <div style={{ padding: '20px' }}>
      <Title order={3} mb="md">Dashboard</Title>
      <Stack gap="md">
        <CameraFeed stageSize={stage} />
        <StageSizeForm />
      </Stack>
    </div>
  );
}
