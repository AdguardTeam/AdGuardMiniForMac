# coding: utf8
from collections import namedtuple

Credentials = namedtuple(
    'Credentials', [
        'version',
        'date',
        'language',
        'type',
        'hash'
    ]
)
