import { writeFile } from 'fs'
import * as sqlite3 from 'better-sqlite3'

const db = sqlite3('sqlite-latest.sqlite')

const EVE_LIGHT_YEAR = 9460730472580800
const EVE_MAX_JUMP_RANGE_LIGHT_YEARS = 7

export interface EveSystems3D {
    solarSystemName: string
    solarSystemId: number
    x: number
    y: number
    z: number
    security: number
    distance?: number
    edges?: EveSystems3D[]
}

function distance(s1: EveSystems3D, s2: EveSystems3D): number {
    const dx = s1.x - s2.x
    const dy = s1.y - s2.y
    const dz = s1.z - s2.z
    const dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2) + Math.pow(dz, 2))
    return dist / EVE_LIGHT_YEAR
}

export function generateStaticJumpGraph() {
    const systems: EveSystems3D[] = db
        .prepare(
            'SELECT solarSystemName ,solarSystemID as solarSystemId, x, y, z, security FROM mapSolarSystems'
        )
        .all()
        .filter((s) => s.security < 0.45)

    const withEdges = systems 
        .map((s1) => {
            const inJumpRange = systems
                .map((s2) => {
                    return {
                        solarSystemId: s2.solarSystemId,
                        solarSystemName: s2.solarSystemName,
                        security: s2.security,
                        distance: distance(s1, s2)
                    }
                })
                .filter((s2) => s2.distance <= EVE_MAX_JUMP_RANGE_LIGHT_YEARS) // Filter out jumps that are too long
                .filter((s2) => s2.solarSystemId !== s1.solarSystemId) // Can't jump to same system
            return {
                solarSystemId: s1.solarSystemId,
                solarSystemName: s1.solarSystemName,
                security: s1.security,
                edges: inJumpRange
            }
        })

    writeFile('./generated/static-jump-graph.json', JSON.stringify(withEdges), (err) => {
        if (err) console.log(err)
        else {
            console.log('File written successfully\n')
        }
    })
}


