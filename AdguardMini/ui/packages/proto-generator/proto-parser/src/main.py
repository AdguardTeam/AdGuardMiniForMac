# coding: utf8
import time
import logging
import helper
import sys

if __name__ == '__main__':
    T0 = time.time()
    T0_STRING = time.ctime(T0).replace(' ', '_').replace(':', '-')
    helper.configure()
    logger = logging.getLogger(__name__)

    try:
        import validator
        import code_generator_abstract_language
        import constants

        logger.info('Begin work on %s', T0_STRING)
        args = helper.get_args()
        validator.validate_args(args)

        for language in args.languages:
            for file_type in (constants.TYPE_SERVICES, constants.TYPE_TYPES, constants.TYPE_CALLBACKS):
                logger.info("Generate %s files for %s language",
                    file_type,
                    language)
                code_generator_abstract_language.generate(language, file_type)

        logger.info(
            'Completed on %s, elapsed %s!',
            time.ctime(time.time()).replace(' ', '_').replace(':', '-'),
            time.time() - T0)

    except Exception as error:
        logger.exception('Unhandled exception: %s', error)
        sys.exit('Unhandled exception')
