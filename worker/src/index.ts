import { handleWorkerRequest, type WorkerEnvironment } from './http/worker-http.js'

export default {
  async fetch(request: Request, environment: WorkerEnvironment): Promise<Response> {
    return handleWorkerRequest(request, environment)
  },
}
