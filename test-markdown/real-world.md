# API 使用示例

## JavaScript 示例

```javascript
async function fetchData() {
  const response = await fetch('/api/data');
  const data = await response.json();
  return data;
}
```

## Python 示例

```python
import requests

def fetch_data():
    response = requests.get('/api/data')
    return response.json()
```

## Shell 脚本

```bash
#!/bin/bash
curl -X GET http://api.example.com/data
```

