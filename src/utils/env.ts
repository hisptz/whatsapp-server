const key = "WHATSAPP_"

export function sanitizeEnv(): void {
    const envVars = Object.keys(process.env)
    const env: Record<string, any> = {}
    for (const envVar of envVars) {
        if (envVar.startsWith(envVar)) env[envVar.replace(key, '')] = process.env[envVar]
    }
    process.env = {...process.env, ...env}
}
