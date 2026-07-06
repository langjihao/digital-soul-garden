import { readLifeData } from '../../utils/life/store'

export default defineEventHandler(async () => {
  const data = await readLifeData()
  // 列表页不需要全部字段原样返回；体积可控（几百条内），直接返回
  return data
})
