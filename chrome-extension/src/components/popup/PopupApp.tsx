import React from 'react'
import { createRoot } from 'react-dom/client'
import { Button, Card, Space, Typography } from 'antd'

const { Title, Text } = Typography

interface PopupAppProps {}

const PopupApp: React.FC<PopupAppProps> = () => {
  return (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>
          Multi-Channel Reply Assistant
        </Title>
        
        <Card size="small">
          <Text type="secondary">
            Gmail、Discord、LINE の統合返信支援
          </Text>
        </Card>
        
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button type="primary" block>
            統合受信箱を開く
          </Button>
          <Button block>
            設定
          </Button>
        </Space>
      </Space>
    </div>
  )
}

// Mount the React component
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<PopupApp />)
}

export default PopupApp