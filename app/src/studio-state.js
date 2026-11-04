export const desktopPlacements={gears:[.235,.48,1.52],differential:[.425,.19,.63],turbine:[.82,.18,.75],robot:[.09,.76,.73],crank:[.58,.78,.76],gimbal:[.93,.86,.48]};
export const mobilePlacements={gears:[.34,.67,.62],differential:[.23,.145,.25],turbine:[.86,.61,.29],robot:[.115,.81,.29],crank:[.62,.85,.31],gimbal:[.87,.75,.31]};
export function placement(type,width){const record=(width<=700?mobilePlacements:desktopPlacements)[type];if(!record)throw Error('Unknown mechanism');return {x:record[0],y:record[1],scale:record[2]};}
export function clampPosition(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid position');return {x:Math.max(.055,Math.min(.945,x)),y:Math.max(.13,Math.min(.88,y))};}
