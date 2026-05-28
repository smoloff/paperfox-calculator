const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1asD1K_0wabCaXY3vlsqJoeyrXiP_fN_yigfcUUclNew/export?format=csv&gid=0';

const MAPPING = {
    print: {
        '4+4':      'Двосторонній друк 4+4',
        '4+0':      'Односторонній друк 4+0',
        '1+1':      'Двосторонній друк 1+1',
        '1+0':      'Односторонній друк 1+0',
        '4+4-wcmy': 'Двосторонній друк 4+4 (W+CMY)',
        '4+0-wcmy': 'Односторонній друк 4+0 (W+CMY)',
    },
    binding: {
        'staple':               'Брошуровка - 2 скоби',
        'glue':                 "М'який переплет",
        'spring-plastic-small': 'Брошуровка А4 - Пластикова пружинка <120 сторінок',
        'spring-plastic-large': 'Брошуровка А4 - Пластикова пружинка >120 сторінок',
        'spring-metal-a4':      'Брошуровка А5/А4 - Металева пружинка',
        'spring-metal-a3':      'Брошуровка А3 - Металева пружинка'
    }
};

const SRA3_W = 310;
const SRA3_H = 440;
const BLEED  = 4;
